
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User as UserIcon, Building, DollarSign, Ruler, ListChecks, Send } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { addDoc, collection, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

const amenitiesList = [
    { id: "lift", label: "Lift" },
    { id: "power_backup", label: "Power Backup" },
    { id: "security", label: "Security" },
    { id: "gated_community", label: "Gated Community" },
    { id: "park_garden", label: "Park/Garden" },
    { id: "swimming_pool", label: "Swimming Pool" },
    { id: "gym", label: "Gym" },
];

const requirementsSchema = z.object({
  propertyType: z.string().min(1, "Please select a property type."),
  preferredLocation: z.string().min(3, "Please enter a preferred location."),
  minBudget: z.coerce.number().min(0, "Minimum budget must be a positive number."),
  maxBudget: z.coerce.number().min(0, "Maximum budget must be a positive number."),
  minSize: z.coerce.number().min(0, "Minimum size must be a positive number."),
  maxSize: z.coerce.number().min(0, "Maximum size must be a positive number."),
  furnishing: z.enum(["unfurnished", "semi-furnished", "fully-furnished"]),
  amenities: z.array(z.string()).optional(),
}).refine(data => data.maxBudget >= data.minBudget, {
    message: "Max budget must be greater than or equal to min budget.",
    path: ["maxBudget"],
}).refine(data => data.maxSize >= data.minSize, {
    message: "Max size must be greater than or equal to min size.",
    path: ["maxSize"],
});

type RequirementsFormValues = z.infer<typeof requirementsSchema>;

export default function PostRequirementsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RequirementsFormValues>({
    resolver: zodResolver(requirementsSchema),
    defaultValues: {
      furnishing: "unfurnished",
      amenities: [],
    },
  });

  const onSubmit = async (values: RequirementsFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, "requirements"), {
            ...values,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            createdAt: Timestamp.now(),
        });
        toast({ title: "Success", description: "Your requirements have been submitted." });
        router.push("/listings/list");
    } catch (error) {
        console.error("Error submitting requirements:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to submit your requirements." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Post Your Property Requirements</h1>
      <p className="text-muted-foreground">Let us know what you're looking for, and we'll help you find it.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><UserIcon className="h-5 w-5 text-primary"/> Personal Details</CardTitle>
                    <CardDescription>This information is auto-filled from your profile.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {user?.name}</div>
                    <div><strong>Email:</strong> {user?.email}</div>
                    <div><strong>Phone:</strong> {user?.phone}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Building className="h-5 w-5 text-primary"/> Property Type & Location</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="propertyType" render={({ field }) => ( <FormItem><FormLabel>I am looking for a</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select property type"/></SelectTrigger></FormControl><SelectContent><SelectItem value="Residential Apartment">Residential Apartment</SelectItem><SelectItem value="Independent House/Villa">Independent House/Villa</SelectItem><SelectItem value="Commercial Office Space">Commercial Office Space</SelectItem><SelectItem value="Plot/Land">Plot/Land</SelectItem></SelectContent></Select><FormMessage/></FormItem> )}/>
                    <FormField control={form.control} name="preferredLocation" render={({ field }) => ( <FormItem><FormLabel>Preferred Location</FormLabel><FormControl><Input placeholder="e.g., City, Neighborhood" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-primary"/> Budget & Size</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField control={form.control} name="minBudget" render={({ field }) => ( <FormItem><FormLabel>Minimum Budget (₹)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                     <FormField control={form.control} name="maxBudget" render={({ field }) => ( <FormItem><FormLabel>Maximum Budget (₹)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                     <FormField control={form.control} name="minSize" render={({ field }) => ( <FormItem><FormLabel>Minimum Size (sqft)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                     <FormField control={form.control} name="maxSize" render={({ field }) => ( <FormItem><FormLabel>Maximum Size (sqft)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ListChecks className="h-5 w-5 text-primary"/> Additional Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="furnishing" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Furnishing Status</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col md:flex-row gap-4"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="unfurnished"/></FormControl><FormLabel className="font-normal">Unfurnished</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="semi-furnished"/></FormControl><FormLabel className="font-normal">Semi-furnished</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="fully-furnished"/></FormControl><FormLabel className="font-normal">Fully-furnished</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="amenities" render={() => (
                        <FormItem>
                            <div className="mb-4"><FormLabel className="text-base">Amenities</FormLabel><FormDescription>Select any amenities you require.</FormDescription></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {amenitiesList.map((item) => (
                                <FormField key={item.id} control={form.control} name="amenities" render={({ field }) => {
                                    return (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))}} /></FormControl>
                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )
                                }}/>
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>

             <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <Send className="mr-2 h-4 w-4"/> Submit Requirements
            </Button>
        </form>
      </Form>
    </div>
  )
}
