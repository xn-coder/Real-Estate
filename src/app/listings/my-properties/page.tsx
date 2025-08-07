
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
import { MoreHorizontal, PlusCircle, ArrowLeft, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'For Sale': 'default',
  'Under Contract': 'secondary',
  'Sold': 'outline',
  'Pending Verification': 'destructive',
}

export default function MyListingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading: isUserLoading } = useUser();
    const [listings, setListings] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchListings = async () => {
            if (!user?.email) return;
            setIsLoading(true);
            try {
                const q = query(collection(db, "properties"), where("email", "==", user.email));
                const snapshot = await getDocs(q);
                const listingsData = await Promise.all(snapshot.docs.map(async (docData) => {
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
                        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                        featureImage: featureImageUrl,
                    };
                }));
                setListings(listingsData);
            } catch (error) {
                console.error("Error fetching listings:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your properties.' });
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchListings();
        }
    }, [user, toast]);
    
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/listings">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">My Properties</h1>
        </div>
        <Button asChild>
            <Link href="/listings/add">
                <PlusCircle className="mr-2 h-4 w-4" /> New Listing
            </Link>
        </Button>
      </div>
      
      {isLoading || isUserLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
                <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>
            ))}
        </div>
      ) : listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>You haven't listed any properties yet.</p>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <Link href={`/listings/${listing.id}`} key={listing.id} className="block hover:shadow-lg transition-shadow rounded-lg">
                <Card className="flex flex-col overflow-hidden shadow-md h-full">
                    <CardHeader className="p-0 relative">
                        <Image
                            alt={listing.catalogTitle || "Property image"}
                            className="aspect-video object-cover"
                            height="225"
                            src={listing.featureImage || 'https://placehold.co/400x225.png'}
                            width="400"
                            data-ai-hint="house exterior"
                        />
                        <div className="absolute top-2 right-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => e.preventDefault()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                        <Badge variant={statusColors[listing.status] || 'default'} className="mb-2">{listing.status}</Badge>
                        <h3 className="font-semibold text-lg leading-tight truncate" title={listing.addressLine}>{listing.addressLine}</h3>
                        <p className="text-muted-foreground text-sm">{listing.city}, {listing.state}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 border-t mt-auto bg-muted/50">
                        <div className="flex justify-between items-center w-full text-sm">
                            <span className="font-bold text-lg text-primary">${listing.listingPrice.toLocaleString()}</span>
                            <span className="text-muted-foreground">{listing.bedrooms}bd / {listing.bathrooms}ba</span>
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
