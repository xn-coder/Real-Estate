
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore"
import type { Resource } from "@/types/resource"
import type { Property } from "@/types/property"
import { useRouter } from "next/navigation"

const ticketSchema = z.object({
  category: z.enum(["Article", "Video", "FAQs", "T&C", "Property", "Other"]),
  itemId: z.string().optional(),
  subject: z.string().min(1, "Subject is required."),
  description: z.string().min(10, "Please provide a detailed description."),
})

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function RaiseTicketPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [resources, setResources] = React.useState<Resource[]>([]);
    const [properties, setProperties] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subject: "",
            description: "",
        },
    });

    const category = form.watch("category");

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const resourcesSnapshot = await getDocs(collection(db, "resources"));
            setResources(resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));

            const propertiesSnapshot = await getDocs(query(collection(db, "properties"), where("status", "!=", "Pending Verification")));
            setProperties(propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load necessary data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const itemOptions = React.useMemo(() => {
        if (!category) return [];

        const categoryMap = {
            'Article': 'article',
            'Video': 'video',
            'FAQs': 'faq',
            'T&C': 'terms_condition',
        };

        if (category === 'Property') {
            return properties.map(p => ({ label: p.catalogTitle, value: p.id }));
        }

        const resourceContentType = categoryMap[category as keyof typeof categoryMap];
        if (resourceContentType) {
            return resources
                .filter(r => r.contentType === resourceContentType)
                .map(r => ({ label: r.title, value: r.id }));
        }

        return [];
    }, [category, properties, resources]);
    
    React.useEffect(() => {
        form.setValue('itemId', '');
    }, [category, form]);

    const onSubmit = async (values: TicketFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const item = itemOptions.find(opt => opt.value === values.itemId);

            await addDoc(collection(db, "support_tickets"), {
                userId: user.id,
                userName: user.name,
                category: values.category,
                itemId: values.itemId || null,
                itemTitle: item?.label || 'N/A',
                subject: values.subject,
                description: values.description,
                status: 'Open',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            toast({ title: "Ticket Submitted", description: "Our team will get back to you shortly." });
            router.push("/support");
        } catch (error) {
            console.error("Error submitting ticket:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to submit your ticket." });
        } finally {
            setIsSubmitting(false);
        }
    };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight font-headline">Raise a Support Ticket</h1>
        </div>
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Submit Your Request</CardTitle>
          <CardDescription>
            Have an issue or a question? Let us know.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Article">Article</SelectItem>
                                        <SelectItem value="Video">Video</SelectItem>
                                        <SelectItem value="FAQs">FAQs</SelectItem>
                                        <SelectItem value="T&C">Terms & Condition</SelectItem>
                                        <SelectItem value="Property">Property</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {category && category !== 'Other' && (
                         <FormField
                            control={form.control}
                            name="itemId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Related Item</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger disabled={isLoading || itemOptions.length === 0}>
                                            <SelectValue placeholder={isLoading ? "Loading..." : `Select a ${category}`} />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {itemOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                            <Input placeholder="e.g., Issue with property listing" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea rows={5} placeholder="Please describe your issue in detail..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Ticket
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
