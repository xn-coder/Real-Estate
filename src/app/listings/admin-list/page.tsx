
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
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"
import { format, addDays } from "date-fns"
import Link from "next/link"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'For Sale': 'default',
  'Under Contract': 'secondary',
  'Sold': 'outline',
  'Pending Verification': 'destructive',
}

export default function AdminListingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [listings, setListings] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "properties"));
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
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/listings">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Admin: All Properties</h1>
                </div>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Listing ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Listing Date</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Views</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : listings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No properties found.
                                </TableCell>
                            </TableRow>
                        ) : listings.map((listing) => {
                            const expiryDate = listing.createdAt ? addDays(new Date(listing.createdAt), 90) : new Date();
                            return (
                                <TableRow key={listing.id}>
                                    <TableCell className="font-mono text-xs">{listing.id}</TableCell>
                                    <TableCell><Badge variant={statusColors[listing.status] || 'default'}>{listing.status}</Badge></TableCell>
                                    <TableCell>{listing.createdAt ? format(new Date(listing.createdAt), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>{format(expiryDate, 'PPP')}</TableCell>
                                    <TableCell>{listing.views || 0}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
