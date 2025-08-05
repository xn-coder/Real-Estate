
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
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
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

export default function ListingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [listings, setListings] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const isSeller = user?.role === 'seller';

    React.useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "properties"), where("status", "!=", "Pending Verification"));
                const snapshot = await getDocs(q);
                const listingsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id, 
                        ...data,
                        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
                    } as Property
                });
                setListings(listingsData);
            } catch (error) {
                console.error("Error fetching listings:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch properties.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchListings();
    }, [toast]);
    
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">All Properties</h1>
        </div>
        {isSeller && (
            <Button asChild>
                <Link href="/listings/add">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Listing
                </Link>
            </Button>
        )}
      </div>
      <div className="border rounded-lg">
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Price</TableHead>
              <TableHead className="hidden md:table-cell">Beds/Baths</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : listings.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No properties found.
                    </TableCell>
                </TableRow>
            ) : listings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Property image"
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={listing.featureImage || 'https://placehold.co/64x64.png'}
                    width="64"
                    data-ai-hint="house exterior"
                  />
                </TableCell>
                <TableCell className="font-medium">{listing.addressLine}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[listing.status] || 'default'}>{listing.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">${listing.listingPrice.toLocaleString()}</TableCell>
                <TableCell className="hidden md:table-cell">{listing.bedrooms}bd / {listing.bathrooms}ba</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
