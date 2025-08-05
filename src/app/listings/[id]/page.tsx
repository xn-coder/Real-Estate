
'use client'

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Property } from "@/types/property"
import { Loader2, ArrowLeft, BedDouble, Bath, Car, Ruler, Heart, Share2, Pencil, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { useUser } from "@/hooks/use-user"
import { Separator } from "@/components/ui/separator"

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

export default function PropertyDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useUser();
    const propertyId = params.id as string

    const [property, setProperty] = React.useState<Property | null>(null)
    const [imageUrls, setImageUrls] = React.useState<string[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const isOwner = user?.role === 'admin' || user?.role === 'seller';

    React.useEffect(() => {
        if (!propertyId) return;
        
        const fetchProperty = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, "properties", propertyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Property;
                    setProperty(data);
                    
                    const urls: string[] = [];
                    // Fetch feature image
                    if (data.featureImageId) {
                         const fileDoc = await getDoc(doc(db, 'files', data.featureImageId));
                         if(fileDoc.exists()) urls.push(fileDoc.data()?.data);
                    }
                    // Fetch slide images
                    for (const slide of data.slides) {
                        if(slide.image) {
                            const fileDoc = await getDoc(doc(db, 'files', slide.image));
                            if(fileDoc.exists()) urls.push(fileDoc.data()?.data);
                        }
                    }
                    setImageUrls(urls);
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

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Listings
                </Button>
                {isOwner && (
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Image Carousel */}
                    <Card>
                        <CardContent className="p-0">
                           <Carousel className="w-full">
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
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: property.overview }} />
                        </CardContent>
                    </Card>

                     {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
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
                    {/* Price & Actions */}
                     <Card className="sticky top-20">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={property.status === 'For Sale' ? 'default' : 'secondary'} className="mb-2">{property.status}</Badge>
                                    <CardTitle className="text-3xl">${property.listingPrice.toLocaleString()}</CardTitle>
                                    <p className="text-muted-foreground">{property.catalogTitle}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon"><Heart className="h-5 w-5"/></Button>
                                    <Button variant="ghost" size="icon"><Share2 className="h-5 w-5"/></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2"><BedDouble className="h-5 w-5 text-muted-foreground"/><p>{property.bedrooms || 'N/A'} beds</p></div>
                                <div className="flex items-center gap-2"><Bath className="h-5 w-5 text-muted-foreground"/><p>{property.bathrooms || 'N/A'} baths</p></div>
                                <div className="flex items-center gap-2"><Car className="h-5 w-5 text-muted-foreground"/><p>{property.parkingSpaces || 'N/A'} parking</p></div>
                                <div className="flex items-center gap-2"><Ruler className="h-5 w-5 text-muted-foreground"/><p>{property.builtUpArea || 'N/A'} {property.unitOfMeasurement}</p></div>
                            </div>
                            <Separator />
                            <Button className="w-full">Contact Agent</Button>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><strong>Listed By:</strong> {property.listedBy}</p>
                            <p><strong>Name:</strong> {property.name}</p>
                            <p><strong>Phone:</strong> {property.phone}</p>
                            <p><strong>Email:</strong> {property.email}</p>
                            {property.agencyName && <p><strong>Agency:</strong> {property.agencyName}</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
