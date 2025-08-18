
'use client'
import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, CheckCircle, XCircle, Loader2, SlidersHorizontal, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"
import type { PropertyType } from "@/types/resource"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"

const propertyCategories = ["Residential", "Commercial", "Land", "Industrial", "Agriculture", "Rental", "Other"];

export default function PendingListingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingListings, setPendingListings] = React.useState<Property[]>([]);
  const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [budget, setBudget] = React.useState<[number, number]>([0, 50000000]);

  const fetchPendingListings = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const typesSnapshot = await getDocs(collection(db, "property_types"));
        setPropertyTypes(typesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));

        const q = query(collection(db, "properties"), where("status", "==", "Pending Verification"));
        const snapshot = await getDocs(q);
        const listingsData = snapshot.docs.map(docData => ({...docData.data(), id: docData.id} as Property));
        setPendingListings(listingsData);
    } catch (error) {
        console.error("Error fetching pending listings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch pending properties.' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchPendingListings();
  }, [fetchPendingListings]);
  
  const handleApprove = async (id: string) => {
    setIsUpdating(id);
    try {
        await updateDoc(doc(db, "properties", id), { status: "For Sale" });
        toast({ title: "Property Approved", description: "The property is now listed for sale." });
        fetchPendingListings();
    } catch (error) {
        console.error("Error approving property:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not approve property.' });
    } finally {
        setIsUpdating(null);
    }
  }

  const handleReject = async (id: string) => {
    setIsUpdating(id);
    try {
        await deleteDoc(doc(db, "properties", id));
        toast({ title: "Property Rejected", description: "The property has been removed." });
        fetchPendingListings();
    } catch (error) {
        console.error("Error rejecting property:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reject property.' });
    } finally {
        setIsUpdating(null);
    }
  }

  const filteredListings = React.useMemo(() => {
    return pendingListings.filter(listing => {
        const typeMatch = propertyTypeFilter === 'all' || listing.propertyTypeId === propertyTypeFilter;
        const categoryMatch = categoryFilter === 'all' || listing.propertyCategory === categoryFilter;
        const budgetMatch = listing.listingPrice >= budget[0] && listing.listingPrice <= budget[1];

        const searchMatch = searchTerm === "" ||
            listing.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.id.toLowerCase().includes(searchTerm.toLowerCase());

        return typeMatch && categoryMatch && budgetMatch && searchMatch;
    });
  }, [pendingListings, searchTerm, propertyTypeFilter, categoryFilter, budget]);
  
  const getPropertyTypeName = (typeId: string) => {
      return propertyTypes.find(pt => pt.id === typeId)?.name || 'N/A';
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Pending Properties</h1>
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
                            placeholder="Search title or ID..."
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : filteredListings.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No pending properties found matching your criteria.</TableCell>
                </TableRow>
            ) : filteredListings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell className="font-medium">{listing.catalogTitle}</TableCell>
                <TableCell>
                    <Badge variant="outline">{listing.propertyCategory}</Badge>
                </TableCell>
                <TableCell>{getPropertyTypeName(listing.propertyTypeId)}</TableCell>
                <TableCell>₹{listing.listingPrice.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={!!isUpdating}>
                        {isUpdating === listing.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => router.push(`/listings/${listing.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleApprove(listing.id)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleReject(listing.id)}>
                        <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/listings/edit/${listing.id}`)}>
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
