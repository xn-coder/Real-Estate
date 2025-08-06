
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from 'next/dynamic';
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, getDoc, Timestamp } from "firebase/firestore"
import { useUser } from "@/hooks/use-user"
import type { Message } from "@/types/message"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const messageFormSchema = z.object({
  messageType: z.enum(["announcement", "to_partner", "to_seller", "to_customer"]),
  announcementType: z.enum(["partner", "seller", "both"]).optional(),
  recipientId: z.string().optional(),
  subject: z.string().min(1, { message: "Subject is required." }),
  details: z.string().min(1, { message: "Details are required." }),
}).refine(data => {
    if (data.messageType === 'announcement') {
        return !!data.announcementType;
    }
    return true;
    }, {
    message: "Please select an announcement type.",
    path: ["announcementType"],
}).refine(data => {
    if ((data.messageType === 'to_partner' || data.messageType === 'to_seller' || data.messageType === 'to_customer') && !data.recipientId) {
      return false;
    }
    return true;
}, {
    message: "Recipient ID is required.",
    path: ["recipientId"],
});

type MessageForm = z.infer<typeof messageFormSchema>;

export default function SendMessagePage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const recipientId = searchParams.get('recipientId');
  const messageTypeParam = searchParams.get('type') as 'to_partner' | 'to_seller' | 'to_customer' | 'announcement' | null;

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      messageType: messageTypeParam || "announcement",
      announcementType: undefined,
      recipientId: recipientId || "",
      subject: "",
      details: ""
    }
  })

  React.useEffect(() => {
    const recipientId = searchParams.get('recipientId');
    const type = searchParams.get('type') as 'to_partner' | 'to_seller' | 'to_customer' | 'announcement' | null;
    
    if (type && recipientId) {
        form.reset({
            messageType: type,
            recipientId: recipientId,
            subject: '',
            details: '',
            announcementType: undefined
        });
    } else if (type) {
         form.reset({
            messageType: type,
            recipientId: '',
            subject: '',
            details: '',
            announcementType: undefined
        });
    }
    else {
        form.reset({
            messageType: 'announcement',
            recipientId: '',
            subject: '',
            details: '',
            announcementType: undefined
        });
    }
  }, [searchParams, form]);


  const messageType = form.watch("messageType")
  const isPrefilled = !!(recipientId && messageTypeParam);

  async function onSubmit(values: MessageForm) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send a message.' });
        return;
    }
    setIsSubmitting(true);

    try {
        let recipients: { id: string, name: string }[] = [];

        if (values.messageType === 'announcement') {
            if (values.announcementType === 'partner') {
                recipients.push({ id: 'ALL_PARTNERS', name: 'All Partners' });
            } else if (values.announcementType === 'seller') {
                recipients.push({ id: 'ALL_SELLERS', name: 'All Sellers' });
            } else if (values.announcementType === 'both') {
                recipients.push({ id: 'ALL_PARTNERS', name: 'All Partners' });
                recipients.push({ id: 'ALL_SELLERS', name: 'All Sellers' });
            }
        } else if ((values.messageType === 'to_partner' || values.messageType === 'to_seller' || values.messageType === 'to_customer') && values.recipientId) {
            const userDoc = await getDoc(doc(db, 'users', values.recipientId));
            if (userDoc.exists()) {
                recipients.push({ id: userDoc.id, name: userDoc.data().name });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Recipient not found.' });
                setIsSubmitting(false);
                return;
            }
        }

        const messagesCollection = collection(db, "messages");
        
        for (const recipient of recipients) {
            const newMessage: Omit<Message, 'id'> = {
                senderId: user.id,
                senderName: user.name,
                recipientId: recipient.id,
                recipientName: recipient.name,
                subject: values.subject,
                body: values.details,
                date: Timestamp.now().toDate(),
                isAnnouncement: values.messageType === 'announcement',
                readBy: {},
            };
            await addDoc(messagesCollection, newMessage);
        }

        toast({
            title: "Message Sent!",
            description: "Your message has been successfully sent.",
        });

        form.reset({
            messageType: "announcement",
            subject: "",
            details: "",
            recipientId: "",
            announcementType: undefined,
        });

    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Send Error",
            description: "An unexpected error occurred. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const recipientLabelMap = {
    to_partner: 'Partner ID',
    to_seller: 'Seller ID',
    to_customer: 'Customer ID',
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Send a Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="messageType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Message Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isPrefilled}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a message type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="announcement">Announcement</SelectItem>
                                    <SelectItem value="to_partner">To Partner</SelectItem>
                                    <SelectItem value="to_seller">To Seller</SelectItem>
                                    <SelectItem value="to_customer">To Customer</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {messageType === 'announcement' && (
                         <FormField
                            control={form.control}
                            name="announcementType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Announcement For</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger disabled={isSubmitting}>
                                        <SelectValue placeholder="Select announcement type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="partner">Partners</SelectItem>
                                    <SelectItem value="seller">Sellers</SelectItem>
                                    <SelectItem value="both">Both (Partners & Sellers)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {(messageType === 'to_partner' || messageType === 'to_seller' || messageType === 'to_customer') && (
                         <FormField
                            control={form.control}
                            name="recipientId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>
                                    {recipientLabelMap[messageType]}
                                </FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder={`Enter ${recipientLabelMap[messageType]}`} 
                                        {...field}
                                        disabled={isSubmitting || isPrefilled}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter message subject" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                     <FormControl>
                        <RichTextEditor
                            initialData={field.value || ''}
                            onChange={field.onChange}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Send Message
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
