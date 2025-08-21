
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
import { PlusCircle, Loader2, Search, SlidersHorizontal, MapPin, Building } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"
import type { PropertyType } from "@/types/resource"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'For Sale': 'default',
  'Under Contract': 'secondary',
  'Sold': 'outline',
  'Pending Verification': 'destructive',
}

const propertyCategories = ["Residential", "Commercial", "Land", "Industrial", "Agriculture", "Rental", "Other"];

export default function ListingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [allListings, setAllListings] = React.useState<Property[]>([]);
    const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([]);
    const [cities, setCities] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [featuredIds, setFeaturedIds] = React.useState<string[]>([]);
    const [recommendedIds, setRecommendedIds] = React.useState<string[]>([]);
    
    // Filter states
    const [activeTab, setActiveTab] = React.useState("all");
    const [searchTerm, setSearchTerm] = React.useState("");
    const [propertyTypeFilter, setPropertyTypeFilter] = React.useState<string>("all");
    const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
    const [cityFilter, setCityFilter] = React.useState<string>("all");
    const [budget, setBudget] = React.useState<[number, number]>([0, 50000000]);

    const canAddProperties = user?.role === 'seller' || user?.role === 'admin';
    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);


    React.useEffect(() => {
        const fetchListingsAndTypes = async () => {
            setIsLoading(true);
            try {
                const typesSnapshot = await getDocs(collection(db, "property_types"));
                setPropertyTypes(typesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));
                
                if (isPartner) {
                    const defaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));
                    if (defaultsDoc.exists()) {
                        const data = defaultsDoc.data();
                        setFeaturedIds(data.partnerFeaturedCatalog || []);
                        setRecommendedIds(data.recommendedCatalog || []);
                    }
                }

                const q = query(collection(db, "properties"), where("status", "in", ["For Sale", "Under Contract", "Sold"]));
                const snapshot = await getDocs(q);
                const uniqueCities = new Set<string>();
                const listingsData = snapshot.docs.map((docData) => {
                    const data = docData.data() as Property;
                    if(data.city) uniqueCities.add(data.city);
                    return {
                        ...data,
                        id: docData.id,
                        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    };
                });
                setAllListings(listingsData);
                setCities(Array.from(uniqueCities));
            } catch (error) {
                console.error("Error fetching listings:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch properties.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchListingsAndTypes();
    }, [toast, isPartner]);
    
    const filteredListings = React.useMemo(() => {
        return allListings.filter(listing => {
            const tabMatch = activeTab === 'all' || 
                             (activeTab === 'featured' && featuredIds.includes(listing.id)) ||
                             (activeTab === 'recommended' && recommendedIds.includes(listing.id));
                             
            const typeMatch = propertyTypeFilter === 'all' || listing.propertyTypeId === propertyTypeFilter;
            const categoryMatch = categoryFilter === 'all' || listing.propertyCategory === categoryFilter;
            const cityMatch = cityFilter === 'all' || listing.city === cityFilter;
            const budgetMatch = listing.listingPrice >= budget[0] && listing.listingPrice <= budget[1];

            const searchMatch = searchTerm === "" ||
                listing.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.addressLine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                listing.id.toLowerCase().includes(searchTerm.toLowerCase());

            return tabMatch && typeMatch && categoryMatch && cityMatch && budgetMatch && searchMatch;
        });
    }, [allListings, searchTerm, propertyTypeFilter, categoryFilter, cityFilter, budget, activeTab, featuredIds, recommendedIds]);


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

       <Card>
        <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                    <Label>Search</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search title, address, or ID..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                 <div>
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {propertyCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label>Type</Label>
                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {propertyTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="lg:col-span-1">
                    <Label>Budget</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                ₹{budget[0].toLocaleString()} - ₹{budget[1].toLocaleString()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                            <div className="space-y-4 p-2">
                                <Label>Price Range</Label>
                                <Slider
                                    defaultValue={budget}
                                    onValueChange={(value) => setBudget(value as [number, number])}
                                    max={50000000}
                                    step={100000}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>₹{budget[0].toLocaleString()}</span>
                                    <span>₹{budget[1].toLocaleString()}</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </CardContent>
       </Card>

        {isPartner && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="featured">Featured</TabsTrigger>
                    <TabsTrigger value="recommended">Recommended</TabsTrigger>
                </TabsList>
            </Tabs>
        )}
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
                <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>
            ))}
        </div>
      ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No properties found matching your criteria.</p>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => (
              <Link href={`/listings/${listing.id}`} key={listing.id} className="block hover:shadow-lg transition-shadow rounded-lg">
                <Card className="flex flex-col overflow-hidden shadow-md h-full">
                    <CardHeader className="p-0 relative">
                        <div className="aspect-video relative">
                            <Image
                                alt={listing.catalogTitle || "Property image"}
                                className="object-cover"
                                fill
                                src={listing.featureImage || 'https://placehold.co/400x225.png'}
                                data-ai-hint="house exterior"
                            />
                        </div>
                         <Badge variant={statusColors[listing.status] || 'default'} className="absolute top-2 right-2">{listing.status}</Badge>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow flex flex-col">
                        <Badge variant="secondary" className="mb-2 w-fit">{listing.propertyCategory}</Badge>
                        <h3 className="font-semibold text-lg leading-tight flex-grow" title={listing.catalogTitle}>{listing.catalogTitle}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4"/>
                            {listing.addressLine}, {listing.city}
                        </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 border-t mt-auto bg-muted/50">
                        <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-lg text-primary">₹{listing.listingPrice.toLocaleString()}</span>
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
