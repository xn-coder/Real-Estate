
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
import { Button } from "@/components/ui/button"
import { Loader2, RotateCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as SellerUser } from "@/types/user"

export default function DeactivatedSellerPage() {
  const { toast } = useToast()
  const [inactiveSellers, setInactiveSellers] = React.useState<SellerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isReactivating, setIsReactivating] = React.useState<string | null>(null)

  const fetchDeactivatedSellers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const inactiveQuery = query(usersCollection, where("role", "==", "seller"), where("status", "==", "inactive"))
      const inactiveSnapshot = await getDocs(inactiveQuery)
      const inactiveList = inactiveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerUser))
      setInactiveSellers(inactiveList)

    } catch (error) {
      console.error("Error fetching deactivated sellers:", error)
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
    fetchDeactivatedSellers()
  }, [fetchDeactivatedSellers])

  const handleReactivate = async (sellerId: string) => {
    setIsReactivating(sellerId);
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await updateDoc(sellerDocRef, {
            status: 'active'
        });
        toast({
            title: "Seller Reactivated",
            description: "The seller has been successfully reactivated.",
        });
        fetchDeactivatedSellers();
    } catch (error) {
        console.error("Error reactivating seller:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reactivate seller.",
        });
    } finally {
        setIsReactivating(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Deactivated Sellers</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Seller Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
                </TableRow>
            ) : inactiveSellers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No deactivated sellers found.
                    </TableCell>
                </TableRow>
            ) : inactiveSellers.map((seller) => (
                <TableRow key={seller.id}>
                <TableCell className="font-medium">{seller.name}</TableCell>
                <TableCell>{seller.email}</TableCell>
                <TableCell>{seller.phone}</TableCell>
                <TableCell className="text-right">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleReactivate(seller.id)}
                        disabled={!!isReactivating}
                    >
                    {isReactivating === seller.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCw className="mr-2 h-4 w-4"/>}
                    Reactivate
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
    </div>
  )
}
