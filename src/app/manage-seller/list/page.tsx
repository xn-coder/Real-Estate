
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
import { MoreHorizontal, PlusCircle, Loader2, Eye, MessageSquare, UserX } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as SellerUser } from "@/types/user"
import Link from "next/link"
import { useRouter } from "next/navigation"

const statusColors: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive'
};


export default function ManageSellerListPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [sellers, setSellers] = React.useState<SellerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchSellers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("role", "==", "seller"), where("status", "==", "active"))
      const sellerSnapshot = await getDocs(q)
      const sellerList = sellerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerUser))
      setSellers(sellerList)
    } catch (error) {
      console.error("Error fetching sellers:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch sellers.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

  const handleDeactivate = async (sellerId: string) => {
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await updateDoc(sellerDocRef, {
            status: 'inactive'
        });
        toast({
            title: "Seller Deactivated",
            description: "The seller has been moved to the deactivated list.",
        });
        fetchSellers();
    } catch (error) {
        console.error("Error deactivating seller:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to deactivate seller.",
        });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Active Sellers</h1>
        <Button asChild>
            <Link href="/manage-seller/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Seller
            </Link>
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seller Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
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
            ) : sellers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No active sellers found.
                    </TableCell>
                </TableRow>
            ) : sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell className="font-medium">{seller.name}</TableCell>
                <TableCell>
                    <Badge variant={statusColors[seller.status || 'active'] || 'default'} className="capitalize">
                        {seller.status || 'active'}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{seller.email}</TableCell>
                <TableCell className="hidden md:table-cell">{seller.phone}</TableCell>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => alert('View Profile page to be implemented')}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/send-message?recipientId=${seller.id}&type=to_seller`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDeactivate(seller.id)} className="text-destructive">
                        <UserX className="mr-2 h-4 w-4" />
                        Deactivate
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
