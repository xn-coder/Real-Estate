
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import type { Lead } from "@/types/lead"

export default function MyPropertiesPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const [properties, setProperties] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchMyProperties = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Find all leads associated with the customer
                const leadsRef = collection(db, "leads");
                const leadsQuery = query(leadsRef, where("customerId", "==", user.id));
                const leadsSnapshot = await getDocs(leadsQuery);
                const propertyIds = [...new Set(leadsSnapshot.docs.map(doc => (doc.data() as Lead).propertyId))];

                if (propertyIds.length === 0) {
                    setProperties([]);
                    setIsLoading(false);
                    return;
                }
                
                // Fetch all properties associated with those leads
                const propertiesRef = collection(db, "properties");
                const propertiesQuery = query(propertiesRef, where("id", "in", propertyIds));
                const propertiesSnapshot = await getDocs(propertiesQuery);
                
                const propertiesData = await Promise.all(propertiesSnapshot.docs.map(async (docData) => {
                    const data = docData.data() as Property;
                    let featureImageUrl = 'https://placehold.co/400x225.png';
                    if (data.featureImageId) {
                        const fileDoc = await getDoc(doc(db, 'files', data.featureImageId));
                        if (fileDoc.exists()) {
                            featureImageUrl = fileDoc.data()?.data;
                        }
                    }
                    return { 
                        ...data,
                        id: docData.id,
                        featureImage: featureImageUrl,
                    };
                }));
                setProperties(propertiesData);
                
            } catch (error) {
                console.error("Error fetching my properties:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your properties.' });
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchMyProperties();
        }
    }, [user, toast]);
    
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Properties</h1>
      </div>
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>
            ))}
        </div>
      ) : properties.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>You have not enquired about any properties yet.</p>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((property) => (
              <Link href={`/listings/${property.id}`} key={property.id} className="block hover:shadow-lg transition-shadow rounded-lg">
                <Card className="flex flex-col overflow-hidden shadow-md h-full">
                    <CardHeader className="p-0 relative">
                        <Image
                            alt={property.catalogTitle || "Property image"}
                            className="aspect-video object-cover"
                            height="225"
                            src={property.featureImage || 'https://placehold.co/400x225.png'}
                            width="400"
                            data-ai-hint="house exterior"
                        />
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                        <Badge variant={'default'} className="mb-2">{property.status}</Badge>
                        <h3 className="font-semibold text-lg leading-tight truncate" title={property.addressLine}>{property.addressLine}</h3>
                        <p className="text-muted-foreground text-sm">{property.city}, {property.state}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 border-t mt-auto bg-muted/50">
                        <div className="flex justify-between items-center w-full text-sm">
                            <span className="font-bold text-lg text-primary">${property.listingPrice.toLocaleString()}</span>
                            <span className="text-muted-foreground">{property.bedrooms}bd / {property.bathrooms}ba</span>
                        </div>
                    </CardFooter>
                </Card>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
