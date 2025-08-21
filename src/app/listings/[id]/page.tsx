
'use client'

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, getDocs, collection, query, where, Timestamp, addDoc, setDoc, deleteDoc, runTransaction } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Property } from "@/types/property"
import type { PropertyType } from "@/types/resource"
import { Loader2, ArrowLeft, BedDouble, Bath, Car, Ruler, Heart, Share2, Pencil, Trash2, CheckCircle, Calendar as CalendarIcon, Building, Info, Sparkles, MapPin, Sofa, DollarSign, List, ShieldCheck, Phone, Mail, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { useUser } from "@/hooks/use-user"
import { Separator } from "@/components/ui/separator"
import Autoplay from "embla-carousel-autoplay"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { createAppointment } from "@/services/appointment-service"
import { generateUserId } from "@/lib/utils"
import bcrypt from "bcryptjs"

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const amenitiesList = [
    { id: "lift", label: "Lift" },
    { id: "power_backup", label: "Power Backup" },
    { id: "security", label: "Security" },
    { id: "water_supply", label: "Water Supply" },
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

const enquiryFormSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  email: z.string().email("A valid email is required."),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  country: z.string().min(1, "Country is required."),
});
type EnquiryFormValues = z.infer<typeof enquiryFormSchema>;


export default function PropertyDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useUser();
    const { toast } = useToast();
    const propertyId = params.id as string

    const [property, setProperty] = React.useState<Property | null>(null)
    const [propertyType, setPropertyType] = React.useState<PropertyType | null>(null);
    const [enquiryCount, setEnquiryCount] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSubmittingEnquiry, setIsSubmittingEnquiry] = React.useState(false);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
    const [lastLeadId, setLastLeadId] = React.useState<string | null>(null);
    const [visitDate, setVisitDate] = React.useState<Date | undefined>(new Date());
    const [isScheduling, setIsScheduling] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const isOwner = user?.role === 'admin' || (user?.email && user.email === property?.email);
    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);


    const plugin = React.useRef(
        Autoplay({ delay: 3000, stopOnInteraction: true })
    )
    
    const enquiryForm = useForm<EnquiryFormValues>({
        resolver: zodResolver(enquiryFormSchema),
        defaultValues: { name: "", phone: "", email: "", city: "", state: "", country: "" },
    });
    
    const onEnquirySubmit = async (values: EnquiryFormValues) => {
        setIsSubmittingEnquiry(true);
        try {
            await createLead(values);
        } catch (error) {
             console.error("Error submitting enquiry:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to submit enquiry. Please try again." });
        } finally {
            setIsSubmittingEnquiry(false);
        }
    };

    const createLead = async (values: EnquiryFormValues) => {
        if (!user || !property) return;

        try {
            const leadsCollection = collection(db, "leads");
            const existingLeadQuery = query(leadsCollection, where("email", "==", values.email), where("propertyId", "==", property.id));
            const existingLeadSnapshot = await getDocs(existingLeadQuery);

            if (!existingLeadSnapshot.empty) {
                toast({
                    variant: "default",
                    title: "Already Enquired",
                    description: "You have already submitted an enquiry for this property.",
                });
                return;
            }

            const usersCollection = collection(db, "users");
            const emailQuery = query(usersCollection, where("email", "==", values.email));
            const phoneQuery = query(usersCollection, where("phone", "==", values.phone));

            const [emailSnapshot, phoneSnapshot] = await Promise.all([
                getDocs(emailQuery),
                getDocs(phoneQuery),
            ]);

            let customerId: string;
            let existingCustomer = true;

            if (!emailSnapshot.empty) {
                customerId = emailSnapshot.docs[0].id;
            } else if (!phoneSnapshot.empty) {
                customerId = phoneSnapshot.docs[0].id;
            } else {
                existingCustomer = false;
                customerId = generateUserId("CUS");
                const [firstName, ...lastNameParts] = values.name.split(' ');
                const lastName = lastNameParts.join(' ');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash("password", salt);

                const newUserData = {
                    id: customerId,
                    name: values.name,
                    firstName: firstName,
                    lastName: lastName,
                    email: values.email,
                    phone: values.phone,
                    password: hashedPassword,
                    role: 'customer',
                    status: 'New lead',
                    address: '',
                    city: values.city,
                    state: values.state,
                    pincode: '',
                    country: values.country,
                    createdAt: Timestamp.now(),
                };
                await setDoc(doc(db, "users", customerId), newUserData);
            }

            const leadData = {
                ...values,
                propertyId: property.id,
                partnerId: user.id,
                customerId: customerId,
                status: "New lead",
                dealStatus: "New lead",
                createdAt: Timestamp.now(),
            };

            const leadRef = await addDoc(leadsCollection, leadData);

            await runTransaction(db, async (transaction) => {
              const propertyRef = doc(db, 'properties', propertyId);
              const propertyDoc = await transaction.get(propertyRef);
              if (!propertyDoc.exists()) {
                  throw "Property does not exist!";
              }
              const newViews = (propertyDoc.data().views || 0) + 1;
              transaction.update(propertyRef, { views: newViews });
            });

            setLastLeadId(leadRef.id);
            setEnquiryCount(prev => prev + 1);

            toast({
                title: "Enquiry Submitted",
                description: "Your enquiry has been sent. We will get back to you shortly.",
            });
            enquiryForm.reset();
            setIsScheduleDialogOpen(true);
        } catch (error) {
            console.error("Error creating lead:", error);
            throw error;
        }
    };


     const handleScheduleVisit = async () => {
        if (!visitDate || !lastLeadId || !user || !property) return;
        setIsScheduling(true);
        try {
            await createAppointment({
                leadId: lastLeadId,
                propertyId: property.id,
                partnerId: user.id,
                visitDate,
            });
            toast({ title: "Visit Scheduled", description: "The site visit has been successfully scheduled." });
            setIsScheduleDialogOpen(false);
        } catch (error: any) {
            console.error("Error scheduling visit:", error);
            toast({ variant: "destructive", title: "Scheduling Failed", description: error.message });
        } finally {
            setIsScheduling(false);
        }
    };

    const handleDeleteProperty = async () => {
        if (!propertyId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "properties", propertyId));
            toast({ title: "Property Deleted", description: "The property has been removed successfully." });
            router.push('/listings/list');
        } catch (error) {
            console.error("Error deleting property:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete property." });
        } finally {
            setIsDeleting(false);
        }
    };


    React.useEffect(() => {
        if (!propertyId) return;
        
        const fetchProperty = async () => {
            setIsLoading(true);
            try {
                const [docSnap, enquiriesSnap] = await Promise.all([
                    getDoc(doc(db, "properties", propertyId)),
                    getDocs(query(collection(db, "leads"), where("propertyId", "==", propertyId)))
                ]);

                setEnquiryCount(enquiriesSnap.size);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Property;
                    setProperty(data);
                    
                    const propTypeSnap = await getDoc(doc(db, 'property_types', data.propertyTypeId));
                    if (propTypeSnap.exists()) {
                        setPropertyType(propTypeSnap.data() as PropertyType);
                    }
                } else {
                    console.error("No such document!");
                }
            } catch (error) {
                console.error("Error fetching document:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProperty();
    }, [propertyId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!property) {
        return (
            <div className="flex items-center justify-center flex-1">
                <p className="text-destructive">Property not found.</p>
            </div>
        )
    }
    
    const imageUrls = [property.featureImage, ...(property.slides || []).map(s => s.image)].filter(Boolean);

    const detailPill = (Icon: React.ElementType, text: React.ReactNode) => (
      <div className="flex items-center gap-2 text-sm bg-muted text-muted-foreground p-2 rounded-md">
        <Icon className="h-4 w-4" />
        <span>{text}</span>
      </div>
    );

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Listings
                </Button>
                {isOwner && (
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => router.push(`/listings/edit/${property.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this
                                        property listing.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteProperty}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Image Carousel */}
                    <Card>
                        <CardContent className="p-0">
                           <Carousel 
                                className="w-full"
                                plugins={[plugin.current]}
                                onMouseEnter={plugin.current.stop}
                                onMouseLeave={plugin.current.reset}
                                opts={{loop: true}}
                            >
                                <CarouselContent>
                                    {imageUrls.length > 0 ? imageUrls.map((url, index) => (
                                        <CarouselItem key={index}>
                                            <div className="aspect-video relative">
                                                <Image src={url} alt={`Property Image ${index + 1}`} layout="fill" objectFit="cover" className="rounded-t-lg" />
                                            </div>
                                        </CarouselItem>
                                    )) : (
                                        <CarouselItem>
                                            <div className="aspect-video relative bg-muted flex items-center justify-center">
                                                <p className="text-muted-foreground">No Images</p>
                                            </div>
                                        </CarouselItem>
                                    )}
                                </CarouselContent>
                                {imageUrls.length > 1 && <>
                                    <CarouselPrevious className="left-4"/>
                                    <CarouselNext className="right-4" />
                                </>}
                            </Carousel>
                        </CardContent>
                    </Card>

                    {/* Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{property.catalogTitle}</CardTitle>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {detailPill(List, property.propertyCategory)}
                                {detailPill(Building, propertyType?.name || 'N/A')}
                                {detailPill(CalendarIcon, property.propertyAge)}
                                {property.reraApproved && detailPill(ShieldCheck, 'RERA Approved')}
                            </div>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: property.overview }} />
                        </CardContent>
                    </Card>

                    {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5"/> Amenities</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {amenitiesList
                                    .filter(amenity => property.amenities?.includes(amenity.id))
                                    .map(amenity => (
                                        <div key={amenity.id} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>{amenity.label}</span>
                                        </div>
                                    ))
                                }
                            </CardContent>
                        </Card>
                    )}

                    {/* Interior & Furnishing */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Sofa className="h-5 w-5"/> Interior & Furnishing</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <p><strong>Status:</strong> <span className="capitalize">{property.furnishingStatus}</span></p>
                            <p><strong>Flooring:</strong> <span className="capitalize">{property.flooringType}</span></p>
                            <p><strong>Kitchen:</strong> <span className="capitalize">{property.kitchenType}</span></p>
                            {property.furnitureIncluded && <p className="col-span-full"><strong>Included:</strong> {property.furnitureIncluded}</p>}
                        </CardContent>
                    </Card>

                    {/* Nearby */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> Nearby</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            {property.busStop && <p><strong>Bus Stop:</strong> {property.busStop}</p>}
                            {property.metroStation && <p><strong>Metro:</strong> {property.metroStation}</p>}
                            {property.hospitalDistance && <p><strong>Hospital:</strong> {property.hospitalDistance}</p>}
                            {property.schoolDistance && <p><strong>School:</strong> {property.schoolDistance}</p>}
                            {property.mallDistance && <p><strong>Mall:</strong> {property.mallDistance}</p>}
                            {property.airportDistance && <p><strong>Airport:</strong> {property.airportDistance}</p>}
                        </CardContent>
                    </Card>

                    {/* Location */}
                    <Card>
                        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
                        <CardContent>
                            <p className="mb-4">{`${property.addressLine}, ${property.locality}, ${property.city}, ${property.state}, ${property.country} - ${property.pincode}`}</p>
                            {property.latitude && property.longitude && (
                                <LocationPicker 
                                    onLocationChange={() => {}} 
                                    position={[parseFloat(property.latitude), parseFloat(property.longitude)]}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={property.status === 'For Sale' ? 'default' : 'secondary'} className="mb-2">{property.status}</Badge>
                                    <CardTitle className="text-3xl">₹{property.listingPrice.toLocaleString()}</CardTitle>
                                    <p className="text-muted-foreground">{property.catalogTitle}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                {detailPill(BedDouble, `${property.bedrooms || 0} Beds`)}
                                {detailPill(Bath, `${property.bathrooms || 0} Baths`)}
                                {detailPill(Car, `${property.parkingSpaces || 0} Parking`)}
                                {detailPill(Ruler, `${property.builtUpArea || 0} ${property.unitOfMeasurement}`)}
                            </div>
                            <Separator />
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>Booking Amount:</span><span className="font-medium">₹{property.bookingAmount.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Security Deposit:</span><span className="font-medium">₹{property.securityDeposit.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Maintenance:</span><span className="font-medium">₹{property.maintenanceCharge.toLocaleString()}</span></div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Total Enquiries:</span>
                                <Badge variant="destructive">{enquiryCount}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5"/> Contact Lister</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><strong>Name:</strong> {property.name}</p>
                            <p><strong>Listed By:</strong> {property.listedBy}</p>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="sm" asChild><a href={`tel:${property.phone}`}><Phone className="mr-2 h-4 w-4"/> Call</a></Button>
                                <Button variant="outline" size="sm" asChild><a href={`mailto:${property.email}`}><Mail className="mr-2 h-4 w-4"/> Email</a></Button>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {isPartner && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Submit Enquiry</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Form {...enquiryForm}>
                                    <form onSubmit={enquiryForm.handleSubmit(onEnquirySubmit)} className="space-y-4">
                                        <FormField control={enquiryForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Full Name</FormLabel> <FormControl><Input placeholder="John Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={enquiryForm.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Phone</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={enquiryForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Email</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <div className="grid grid-cols-3 gap-2">
                                            <FormField control={enquiryForm.control} name="city" render={({ field }) => ( <FormItem className="col-span-1"> <FormLabel className="text-xs">City</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            <FormField control={enquiryForm.control} name="state" render={({ field }) => ( <FormItem className="col-span-1"> <FormLabel className="text-xs">State</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            <FormField control={enquiryForm.control} name="country" render={({ field }) => ( <FormItem className="col-span-1"> <FormLabel className="text-xs">Country</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={isSubmittingEnquiry}>
                                            {isSubmittingEnquiry && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Submit Enquiry
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule a Site Visit</DialogTitle>
                        <DialogDescription>
                            Your enquiry was submitted. Would you like to schedule a site visit?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={visitDate}
                            onSelect={setVisitDate}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsScheduleDialogOpen(false)}>Skip for now</Button>
                        <Button onClick={handleScheduleVisit} disabled={isScheduling}>
                            {isScheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Confirm Visit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
