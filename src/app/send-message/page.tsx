
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

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const messageFormSchema = z.object({
  messageType: z.enum(["announcement", "to_partner", "to_seller"], {
    required_error: "Please select a message type.",
  }),
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
    if (data.messageType === 'to_partner' || data.messageType === 'to_seller') {
        return !!data.recipientId && data.recipientId.trim().length > 0;
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPrefilled, setIsPrefilled] = React.useState(false);

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      messageType: "announcement",
      subject: "",
      details: "",
      recipientId: "",
    },
  })

  React.useEffect(() => {
    const recipientId = searchParams.get('recipientId');
    const type = searchParams.get('type');
    if (recipientId && (type === 'to_partner' || type === 'to_seller')) {
      form.setValue('recipientId', recipientId);
      form.setValue('messageType', type);
      setIsPrefilled(true);
    } else {
      setIsPrefilled(false);
    }
  }, [searchParams, form]);


  const messageType = form.watch("messageType")

  async function onSubmit(values: MessageForm) {
    setIsSubmitting(true);
    console.log(values)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Message Sent!",
      description: "Your message has been successfully sent.",
    })
    form.reset({
      messageType: "announcement",
      subject: "",
      details: "",
      recipientId: ""
    })
    setIsSubmitting(false);
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
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting || isPrefilled}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a message type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="announcement">Announcement</SelectItem>
                                <SelectItem value="to_partner">To Partner</SelectItem>
                                <SelectItem value="to_seller">To Seller</SelectItem>
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
                                    <SelectItem value="both">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {(messageType === 'to_partner' || messageType === 'to_seller') && !isPrefilled && (
                         <FormField
                            control={form.control}
                            name="recipientId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>
                                    {messageType === 'to_partner' ? 'Partner ID' : 'Seller ID'}
                                </FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder={`Enter ${messageType === 'to_partner' ? 'Partner' : 'Seller'} ID`} 
                                        {...field}
                                        disabled={isSubmitting}
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
                            initialData={field.value}
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
