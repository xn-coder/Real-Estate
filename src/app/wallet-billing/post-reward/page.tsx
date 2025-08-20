
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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import dynamic from 'next/dynamic';
import { Loader2, ArrowLeft, Gift } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import Image from "next/image"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const rewardOfferSchema = z.object({
  title: z.string().min(1, "Title is required."),
  image: z.any().refine(file => file, "Image is required."),
  points: z.coerce.number().min(1, "Points must be at least 1."),
  details: z.string().min(10, "Details are required."),
});

type RewardOfferFormValues = z.infer<typeof rewardOfferSchema>;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function PostRewardOfferPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<RewardOfferFormValues>({
        resolver: zodResolver(rewardOfferSchema),
        defaultValues: {
            title: "",
            points: 0,
            details: "",
        },
    });

    const imageFile = form.watch("image");

    const onSubmit = async (values: RewardOfferFormValues) => {
        setIsSubmitting(true);
        try {
            const imageFileId = generateUserId("FILE");
            const imageUrl = await fileToDataUrl(values.image);
            await setDoc(doc(db, "files", imageFileId), { data: imageUrl });

            const offerId = generateUserId("REWARD");
            await setDoc(doc(db, "reward_offers", offerId), {
                id: offerId,
                title: values.title,
                imageId: imageFileId,
                points: values.points,
                details: values.details,
            });

            toast({ title: "Success", description: "Reward offer has been posted." });
            form.reset();
        } catch (error) {
            console.error("Error posting reward offer:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not post the reward offer." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/wallet-billing">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight font-headline">Post a Reward Offer</h1>
            </div>
            
            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Create New Reward Offer</CardTitle>
                    <CardDescription>Fill in the details for the new reward offer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                             <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Offer Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 5% Off Your Next Purchase" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="image"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Offer Image</FormLabel>
                                            <FormControl>
                                                <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                            </FormControl>
                                            {imageFile && <Image src={URL.createObjectURL(imageFile)} alt="Preview" width={100} height={100} className="mt-2 rounded-md object-cover" />}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="points"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Points Required</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 500" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="details"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Offer Details</FormLabel>
                                        <FormControl>
                                            <RichTextEditor initialData={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Post Offer
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
