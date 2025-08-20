

'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
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
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, updateDoc, getDocs, setDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, PlusCircle, Trash2, Upload, MapPin } from "lucide-react"
import type { PropertyType } from "@/types/resource"
import type { Property } from "@/types/property"
import { Switch } from "@/components/ui/switch"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { uploadFile } from "@/services/file-upload-service"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

// Helper to clean data for Firestore
const cleanDataForFirebase = (data: Record<string, any>) => {
    const cleanedData: Record<string, any> = {};
    for (const key in data) {
        if (data[key] !== undefined) {
            cleanedData[key] = data[key];
        } else {
            cleanedData[key] = null; // Convert undefined to null
        }
    }
    return cleanedData;
};


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileSchema = z.any()
    .refine((file) => file, "Image is required.")
    .refine((file) => !file || file.size === undefined || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine((file) => !file || file.type === undefined || ACCEPTED_IMAGE_TYPES.includes(file.type), ".jpg, .jpeg, .png and .webp files are accepted.")
    .or(z.string()); // Allow existing string URLs

const step1Schema = z.object({
  catalogTitle: z.string().min(1, "Catalog title is required."),
  catalogMetaDescription: z.string().min(1, "Meta description is required."),
  catalogMetaKeyword: z.string().min(1, "Meta keywords are required."),
  propertyCategory: z.enum(["Residential", "Commercial", "Land", "Industrial", "Agriculture", "Rental", "Other"]),
  propertyTypeId: z.string().min(1, "Please select a property type."),
  propertyAge: z.enum(["New", "<1 year", "1 - 5 years", "5 - 10 years", "10+ years"]),
  reraApproved: z.boolean().default(false),
  featureImage: fileSchema,
  catalogType: z.enum(["New Project", "Project", "Resales", "Rental", "Other"]),
});

const step2Schema = z.object({
    slides: z.array(z.object({
        id: z.string().optional(),
        image: fileSchema,
        title: z.string().min(1, "Slideshow title is required."),
    })).min(1, "At least one slideshow item is required."),
});

const step3Schema = z.object({
    overview: z.string().min(20, "Overview should be at least 20 characters."),
});

const step4Schema = z.object({
    builtUpArea: z.coerce.number().min(0).optional(),
    isBuiltUpAreaEnabled: z.boolean().default(true),
    carpetArea: z.coerce.number().min(0).optional(),
    isCarpetAreaEnabled: z.boolean().default(true),
    superBuiltUpArea: z.coerce.number().min(0).optional(),
    isSuperBuiltUpAreaEnabled: z.boolean().default(true),
    unitOfMeasurement: z.enum(["sq. ft", "sq. m", "acres", "other"]),
    totalFloors: z.coerce.number().min(0).optional(),
    isTotalFloorsEnabled: z.boolean().default(true),
    floorNumber: z.coerce.number().min(0).optional(),
    isFloorNumberEnabled: z.boolean().default(true),
    bedrooms: z.coerce.number().min(0).optional(),
    isBedroomsEnabled: z.boolean().default(true),
    bathrooms: z.coerce.number().min(0).optional(),
    isBathroomsEnabled: z.boolean().default(true),
    balconies: z.coerce.number().min(0).optional(),
    isBalconiesEnabled: z.boolean().default(true),
    servantRoom: z.boolean().default(false),
    parkingSpaces: z.coerce.number().min(0).optional(),
    isParkingSpacesEnabled: z.boolean().default(true),
});

const step5Schema = z.object({
    amenities: z.array(z.string()).optional(),
});

const step6Schema = z.object({
    furnishingStatus: z.enum(["fully", "semi", "unfurnished"]),
    flooringType: z.enum(["vitrified", "marble", "wood", "other"]),
    kitchenType: z.enum(["modular", "normal"]),
    furnitureIncluded: z.string().optional(),
});

const step7Schema = z.object({
    locality: z.string().min(1, "Locality/Area is required."),
    addressLine: z.string().min(1, "Address is required."),
    city: z.string().min(1, "City is required."),
    state: z.string().min(1, "State is required."),
    country: z.string().min(1, "Country is required."),
    pincode: z.string().min(6, "Valid pincode is required."),
    landmark: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
});

const step8Schema = z.object({
    busStop: z.string().optional(),
    metroStation: z.string().optional(),
    hospitalDistance: z.string().optional(),
    mallDistance: z.string().optional(),
    airportDistance: z.string().optional(),
    schoolDistance: z.string().optional(),
    otherConnectivity: z.string().optional(),
});

const step9Schema = z.object({
    listingPrice: z.coerce.number().min(1, "Price is required."),
    priceType: z.enum(["fixed", "negotiable", "auction"]),
    maintenanceCharge: z.coerce.number().min(0),
    securityDeposit: z.coerce.number().min(0),
    bookingAmount: z.coerce.number().min(0),
    registrationCharge: z.coerce.number().min(0),
    loanAvailable: z.boolean().default(false),
});

const step10Schema = z.object({
    listedBy: z.enum(["Owner", "Agent", "Builder", "Team"]),
    name: z.string().min(1, "Name is required."),
    phone: z.string().min(10, "Valid phone number is required."),
    altPhone: z.string().optional(),
    email: z.string().email(),
    agencyName: z.string().optional(),
    reraId: z.string().optional(),
    contactTime: z.enum(["Morning", "Afternoon", "Evening"]),
});

const allSteps = [
    step1Schema, step2Schema, step3Schema, step4Schema, step5Schema,
    step6Schema, step7Schema, step8Schema, step9Schema, step10Schema
];

const fullSchema = allSteps.reduce((acc, schema) => acc.merge(schema), z.object({}));

type EditPropertyForm = z.infer<typeof fullSchema>;

const amenitiesList = [
    { id: "lift", label: "Lift" },
    { id: "power_backup", label: "Power Backup" },
    { id: "security", label: "Security (CCTV, Guard)" },
    { id: "water_supply", label: "Water Supply (24x7)" },
    { id: "gated_community", label: "Gated Community" },
    { id: "gas_pipeline", label: "Gas Pipeline" },
    { id: "park_garden", label: "Park/Garden" },
    { id: "swimming_pool", label: "Swimming Pool" },
    { id: "club_house", label: "Clubhouse" },
    { id: "gym", label: "Gym" },
    { id: "rainwater_harvesting", label: "Rainwater Harvesting" },
    { id: "internet_wifi", label: "Internet/Wifi" },
    { id: "intercom", label: "Intercom" },
    { id: "fire_safety", label: "Fire Safety" },
    { id: "solar_power", label: "Solar Power" },
    { id: "visitor_parking", label: "Visitor Parking" },
    { id: "waste_disposal", label: "Waste Disposal" },
    { id: "pets_allowed", label: "Pets Allowed" },
    { id: "wheelchair_access", label: "Wheelchair Access" },
];

export default function EditPropertyPage() {
    const { toast } = useToast()
    const router = useRouter();
    const params = useParams();
    const propertyId = params.id as string;
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [currentStep, setCurrentStep] = React.useState(0);
    const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([]);

    const form = useForm<EditPropertyForm>({
        resolver: zodResolver(fullSchema),
        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "slides"
    });

    React.useEffect(() => {
        const fetchInitialData = async () => {
            if (!propertyId) return;
            setIsLoadingData(true);
            try {
                // Fetch property types
                const typesSnapshot = await getDocs(collection(db, "property_types"));
                setPropertyTypes(typesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));

                // Fetch property data
                const propDocRef = doc(db, "properties", propertyId);
                const propDocSnap = await getDoc(propDocRef);

                if (!propDocSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Property not found.' });
                    router.push('/listings/list');
                    return;
                }

                const propertyData = propDocSnap.data() as Property;
                
                form.reset({
                    ...propertyData,
                });
                
            } catch (error) {
                console.error("Error fetching property data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch property data for editing.' });
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInitialData();
    }, [propertyId, form, router, toast]);

    const handleNextStep = async () => {
        const currentStepSchema = allSteps[currentStep];
        const fieldsToValidate = Object.keys(currentStepSchema.shape) as (keyof EditPropertyForm)[];
        const isValid = await form.trigger(fieldsToValidate);

        if (isValid) {
            if (currentStep < allSteps.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                await form.handleSubmit(onFinalSubmit)();
            }
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const onFinalSubmit = async (values: EditPropertyForm) => {
        setIsSubmitting(true);
        try {
            const propertyRef = doc(db, "properties", propertyId);
            
            let featureImageUrl = values.featureImage;
            if (values.featureImage && typeof values.featureImage !== 'string') {
                featureImageUrl = await uploadFile(values.featureImage);
            }
            
            const slidesWithUrls = await Promise.all(
                values.slides.map(async (slide) => {
                    let slideImageUrl = slide.image;
                    if (slide.image && typeof slide.image !== 'string') {
                        slideImageUrl = await uploadFile(slide.image);
                    }
                    return {
                        title: slide.title,
                        image: slideImageUrl,
                    };
                })
            );

            const updatedData = {
                ...values,
                featureImage: featureImageUrl,
                slides: slidesWithUrls,
            };

            await updateDoc(propertyRef, cleanDataForFirebase(updatedData));

            toast({
                title: "Property Updated",
                description: "Your property has been successfully updated.",
            });
            router.push(`/listings/${propertyId}`);

        } catch (error) {
            console.error("Error updating property:", error);
            toast({
                variant: "destructive",
                title: "Update Error",
                description: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        "Property Classification", "Add Slideshow", "Write Overview",
        "Property Size & Structure", "Features & Amenities", "Interior & Furnishing",
        "Location Details", "Nearby Connectivity", "Pricing & Financials", "Contact & Listing Agent"
    ];
    
    const lat = form.watch('latitude');
    const lon = form.watch('longitude');

     if (isLoadingData) {
        return <div className="flex-1 flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/listings/${propertyId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                 <div className="p-2 bg-muted rounded-md">
                    <h1 className="text-xl font-bold tracking-tight font-headline">Edit Property</h1>
                    <p className="text-sm text-muted-foreground font-mono">Property ID: {propertyId}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Step {currentStep + 1}: {steps[currentStep]}</CardTitle>
                    <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${((currentStep + 1) / allSteps.length) * 100}%` }}></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                           
                            {currentStep === 0 && (
                                <div className="space-y-4">
                                     <FormField control={form.control} name="catalogTitle" render={({ field }) => ( <FormItem><FormLabel>Catalog Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                     <FormField control={form.control} name="catalogMetaDescription" render={({ field }) => ( <FormItem><FormLabel>Meta Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                                     <FormField control={form.control} name="catalogMetaKeyword" render={({ field }) => ( <FormItem><FormLabel>Meta Keywords</FormLabel><FormControl><Input placeholder="e.g. apartment, 3bhk, luxury" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                     <div className="grid md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="propertyCategory" render={({ field }) => ( <FormItem><FormLabel>Property Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Residential">Residential</SelectItem><SelectItem value="Commercial">Commercial</SelectItem><SelectItem value="Land">Land</SelectItem><SelectItem value="Industrial">Industrial</SelectItem><SelectItem value="Agriculture">Agriculture</SelectItem><SelectItem value="Rental">Rental</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="propertyTypeId" render={({ field }) => ( <FormItem><FormLabel>Property Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type"/></SelectTrigger></FormControl><SelectContent>{propertyTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                     </div>
                                     <div className="grid md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="propertyAge" render={({ field }) => ( <FormItem><FormLabel>Property Age</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="<1 year">&lt;1 year</SelectItem><SelectItem value="1 - 5 years">1 - 5 years</SelectItem><SelectItem value="5 - 10 years">5 - 10 years</SelectItem><SelectItem value="10+ years">10+ years</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="catalogType" render={({ field }) => ( <FormItem><FormLabel>Catalog Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="New Project">New Project</SelectItem><SelectItem value="Project">Project</SelectItem><SelectItem value="Resales">Resales</SelectItem><SelectItem value="Rental">Rental</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                     </div>
                                      <FormField control={form.control} name="reraApproved" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>RERA Approved</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                                      <FormField control={form.control} name="featureImage" render={({ field: { onChange, value } }) => ( <FormItem><FormLabel>Featured Image</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} /></FormControl>{typeof value === 'string' && value && <Image src={value} alt="Current feature image" width={100} height={100} className="mt-2 rounded-md"/>}<FormMessage /></FormItem> )} />
                                </div>
                            )}

                           {currentStep === 1 && (
                                <div className="space-y-4">
                                    {fields.map((field, index) => {
                                        const imagePreview = form.watch(`slides.${index}.image`);
                                        return (
                                        <div key={field.id} className="border rounded-lg p-4 relative">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                     <FormField
                                                        control={form.control}
                                                        name={`slides.${index}.image`}
                                                        render={({ field: { onChange, value } }) => (
                                                            <FormItem>
                                                                <FormLabel>Image</FormLabel>
                                                                <div className="w-full aspect-[16/9] bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                                                   {imagePreview ? (
                                                                        <Image
                                                                            src={typeof imagePreview === 'string' ? imagePreview : URL.createObjectURL(imagePreview)}
                                                                            alt="Banner Preview"
                                                                            width={1200}
                                                                            height={675}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">Image Preview</span>
                                                                    )}
                                                                </div>
                                                                <FormControl>
                                                                    <Input className="hidden" id={`banner-upload-${index}`} type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} />
                                                                </FormControl>
                                                                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById(`banner-upload-${index}`)?.click()}>
                                                                    <Upload className="mr-2 h-4 w-4" /> Upload
                                                                </Button>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <FormField control={form.control} name={`slides.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Promotion Title" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )})}
                                    <Button type="button" variant="outline" onClick={() => append({ title: '', image: null })}>
                                        <PlusCircle className="mr-2 h-4 w-4"/>Add Slide
                                    </Button>
                                </div>
                            )}

                            {currentStep === 2 && ( <FormField control={form.control} name="overview" render={({ field }) => ( <FormItem><FormLabel>Overview</FormLabel><FormControl><RichTextEditor initialData={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} /> )}
                            
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                        <FormField control={form.control} name="unitOfMeasurement" render={({ field }) => ( <FormItem><FormLabel>Unit of Measurement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="sq. ft">Sq. Ft.</SelectItem><SelectItem value="sq. m">Sq. M.</SelectItem><SelectItem value="acres">Acres</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="servantRoom" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Servant/Store Room</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                                        
                                        <FormField control={form.control} name="isBuiltUpAreaEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Built-up Area</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("builtUpArea")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isCarpetAreaEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Carpet Area</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("carpetArea")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isSuperBuiltUpAreaEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Super Built-up Area</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("superBuiltUpArea")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isTotalFloorsEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Total Floors</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("totalFloors")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isFloorNumberEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Floor Number</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("floorNumber")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isBedroomsEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Bedrooms</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("bedrooms")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isBathroomsEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Bathrooms</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("bathrooms")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isBalconiesEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Balconies</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("balconies")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="isParkingSpacesEnabled" render={({ field }) => ( <FormItem> <div className="flex items-center gap-2 mb-2"> <FormLabel>Parking Spaces</FormLabel> <Switch checked={field.value} onCheckedChange={field.onChange}/> </div> <Input type="number" {...form.register("parkingSpaces")} disabled={!field.value} /> <FormMessage /> </FormItem> )} />
                                    </div>
                                </div>
                            )}

                             {currentStep === 4 && (
                                <FormField
                                    control={form.control}
                                    name="amenities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Features & Amenities</FormLabel>
                                                <FormDescription>Select all the amenities that apply.</FormDescription>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {amenitiesList.map((item) => (
                                                    <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                    ? field.onChange([...(field.value || []), item.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                            (value) => value !== item.id
                                                                        )
                                                                        )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="text-sm font-normal">
                                                            {item.label}
                                                        </FormLabel>
                                                    </FormItem>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            {currentStep === 5 && ( <div className="grid md:grid-cols-2 gap-4"> <FormField control={form.control} name="furnishingStatus" render={({ field }) => ( <FormItem><FormLabel>Furnishing Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fully">Fully Furnished</SelectItem><SelectItem value="semi">Semi-Furnished</SelectItem><SelectItem value="unfurnished">Unfurnished</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> <FormField control={form.control} name="flooringType" render={({ field }) => ( <FormItem><FormLabel>Flooring Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="vitrified">Vitrified</SelectItem><SelectItem value="marble">Marble</SelectItem><SelectItem value="wood">Wood</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> <FormField control={form.control} name="kitchenType" render={({ field }) => ( <FormItem><FormLabel>Kitchen Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="modular">Modular</SelectItem><SelectItem value="normal">Normal</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> <FormField control={form.control} name="furnitureIncluded" render={({ field }) => ( <FormItem><FormLabel>Wardrobes/Furniture Included</FormLabel><FormControl><Textarea placeholder="e.g. 2 Wardrobes, 1 Sofa Set" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> </div> )}

                            {currentStep === 6 && ( <div className="space-y-4"> <div className="grid md:grid-cols-2 gap-4"> <FormField control={form.control} name="locality" render={({ field }) => ( <FormItem><FormLabel>Locality/Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="addressLine" render={({ field }) => ( <FormItem><FormLabel>Address Line</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="state" render={({ field }) => ( <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="country" render={({ field }) => ( <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="pincode" render={({ field }) => ( <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="landmark" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Nearby Landmark</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> </div> <div> <FormLabel>Pin Location on Map</FormLabel> <LocationPicker onLocationChange={(lat, lng) => { form.setValue('latitude', lat.toString()); form.setValue('longitude', lng.toString()); }} position={lat && lon ? [parseFloat(lat), parseFloat(lon)] : undefined} /> <p className="text-sm text-muted-foreground mt-2">Lat: {lat || 'N/A'}, Lng: {lon || 'N/A'}</p> </div> </div> )}

                            {currentStep === 7 && ( <div className="grid md:grid-cols-2 gap-4"> <FormField control={form.control} name="busStop" render={({ field }) => ( <FormItem><FormLabel>Nearest Bus Stop</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="metroStation" render={({ field }) => ( <FormItem><FormLabel>Nearest Metro Station</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="hospitalDistance" render={({ field }) => ( <FormItem><FormLabel>Distance from Hospital</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="mallDistance" render={({ field }) => ( <FormItem><FormLabel>Nearest Mall</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="airportDistance" render={({ field }) => ( <FormItem><FormLabel>Distance from Airport</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="schoolDistance" render={({ field }) => ( <FormItem><FormLabel>Distance from School/College</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="otherConnectivity" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Other</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> </div> )}

                            {currentStep === 8 && ( <div className="grid md:grid-cols-2 gap-4"> <FormField control={form.control} name="listingPrice" render={({ field }) => ( <FormItem><FormLabel>Listing Price/Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="priceType" render={({ field }) => ( <FormItem><FormLabel>Price Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="negotiable">Negotiable</SelectItem><SelectItem value="auction">Auction</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> <FormField control={form.control} name="maintenanceCharge" render={({ field }) => ( <FormItem><FormLabel>Maintenance Charge</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="securityDeposit" render={({ field }) => ( <FormItem><FormLabel>Security Deposit (Rent)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="bookingAmount" render={({ field }) => ( <FormItem><FormLabel>Booking Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="registrationCharge" render={({ field }) => ( <FormItem><FormLabel>Registration Charge</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="loanAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2"><div className="space-y-0.5"><FormLabel>Loan Facility Available</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} /> </div> )}

                            {currentStep === 9 && ( <div className="grid md:grid-cols-2 gap-4"> <FormField control={form.control} name="listedBy" render={({ field }) => ( <FormItem><FormLabel>Listed By</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Owner">Owner</SelectItem><SelectItem value="Agent">Agent</SelectItem><SelectItem value="Builder">Builder</SelectItem><SelectItem value="Team">Team</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="altPhone" render={({ field }) => ( <FormItem><FormLabel>Alternative Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="agencyName" render={({ field }) => ( <FormItem><FormLabel>Agency Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="reraId" render={({ field }) => ( <FormItem><FormLabel>RERA ID</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="contactTime" render={({ field }) => ( <FormItem><FormLabel>Preferred Contact Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Evening">Evening</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /> </div> )}

                            <div className="flex justify-between pt-4">
                                {currentStep > 0 ? ( <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>Previous</Button> ) : ( <div></div> )}
                                <Button type="button" onClick={handleNextStep} disabled={isSubmitting}>
                                    {isSubmitting && currentStep === allSteps.length - 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {currentStep === allSteps.length - 1 ? 'Save Changes' : 'Next'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
