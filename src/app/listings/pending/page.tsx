
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
import { MoreHorizontal, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Property } from "@/types/property"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'For Sale': 'default',
  'Under Contract': 'secondary',
  'Sold': 'outline',
  'Pending Verification': 'destructive',
}

export default function PendingListingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingListings, setPendingListings] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const fetchPendingListings = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const q = query(collection(db, "properties"), where("status", "==", "Pending Verification"));
        const snapshot = await getDocs(q);
        const listingsData = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as Property;
            let featureImageUrl = 'https://placehold.co/64x64.png';
            if (data.featureImageId) {
                const fileDoc = await getDoc(db.collection('files').doc(data.featureImageId));
                if (fileDoc.exists()) {
                    featureImageUrl = fileDoc.data()?.data;
                }
            }
            return { ...data, id: doc.id, featureImage: featureImageUrl };
        }));
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Pending Properties</h1>
        </div>
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
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : pendingListings.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No pending properties found.</TableCell>
                </TableRow>
            ) : pendingListings.map((listing) => (
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
                <TableCell>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={!!isUpdating}>
                        {isUpdating === listing.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => handleApprove(listing.id)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleReject(listing.id)}>
                        <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
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
