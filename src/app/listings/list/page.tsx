
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, PlusCircle, Loader2, Search, Ruler, Bed, Bath } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'For Sale': 'default',
  'Under Contract': 'secondary',
  'Sold': 'outline',
  'Pending Verification': 'destructive',
}

const filterableStatuses: (Property['status'] | 'All')[] = ['All', 'For Sale', 'Under Contract', 'Sold'];

export default function ListingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [allListings, setAllListings] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [activeFilter, setActiveFilter] = React.useState<Property['status'] | 'All'>("All");

    const canAddProperties = user?.role === 'seller' || user?.role === 'admin';

    React.useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "properties"), where("status", "!=", "Pending Verification"));
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
                setAllListings(listingsData);
            } catch (error) {
                console.error("Error fetching listings:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch properties.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchListings();
    }, [toast]);
    
    const filteredListings = React.useMemo(() => {
        return allListings.filter(listing => {
            const statusMatch = activeFilter === 'All' || listing.status === activeFilter;
            const searchMatch = searchTerm === "" ||
                listing.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.addressLine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.id.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [allListings, searchTerm, activeFilter]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight font-headline">All Properties</h1>
        </div>
        {canAddProperties && (
            <Button asChild>
                <Link href="/listings/add">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Listing
                </Link>
            </Button>
        )}
      </div>

       <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title, address, or ID..."
            className="pl-8 sm:w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as Property['status'] | 'All')}>
          <TabsList>
            {filterableStatuses.map(status => (
                 <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
                <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>
            ))}
        </div>
      ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No properties found.</p>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => (
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
                         <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
                             <h3 className="font-semibold text-lg text-white leading-tight truncate" title={listing.catalogTitle}>{listing.catalogTitle}</h3>
                             <p className="text-sm text-gray-200 truncate">{listing.addressLine}</p>
                        </div>
                        {canAddProperties && (
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
                        )}
                    </CardHeader>
                    <CardContent className="p-4 flex-grow grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground"><Bed className="h-4 w-4"/><span>{listing.bedrooms} Beds</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground"><Bath className="h-4 w-4"/><span>{listing.bathrooms} Baths</span></div>
                        <div className="col-span-2 flex items-center gap-2 text-muted-foreground"><Ruler className="h-4 w-4"/><span>{listing.builtUpArea?.toLocaleString() || 'N/A'} {listing.unitOfMeasurement}</span></div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 border-t mt-auto bg-muted/50">
                        <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-lg text-primary">₹{listing.listingPrice.toLocaleString()}</span>
                             <Badge variant={statusColors[listing.status] || 'default'}>{listing.status}</Badge>
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
