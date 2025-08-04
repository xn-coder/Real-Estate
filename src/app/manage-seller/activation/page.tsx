
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
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as SellerUser } from "@/types/user"

export default function SellerActivationPage() {
  const { toast } = useToast()
  const [pendingSellers, setPendingSellers] = React.useState<SellerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null)

  const fetchPendingSellers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("role", "==", "seller"), where("status", "==", "pending"))
      const sellerSnapshot = await getDocs(q)
      const sellerList = sellerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerUser))
      setPendingSellers(sellerList)
    } catch (error) {
      console.error("Error fetching pending sellers:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch sellers for activation.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchPendingSellers()
  }, [fetchPendingSellers])

  const handleUpdateStatus = async (sellerId: string, status: 'active' | 'inactive') => {
    setIsUpdating(sellerId);
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await updateDoc(sellerDocRef, {
            status: status
        });
        toast({
            title: `Seller ${status === 'active' ? 'Activated' : 'Rejected'}`,
            description: `The seller has been successfully ${status === 'active' ? 'activated' : 'rejected'}.`,
        });
        fetchPendingSellers();
    } catch (error) {
        console.error("Error updating seller status:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update seller status.",
        });
    } finally {
        setIsUpdating(null);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Seller Activation</h1>
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
            ) : pendingSellers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No sellers are currently pending activation.
                    </TableCell>
                </TableRow>
            ) : pendingSellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell className="font-medium">{seller.name}</TableCell>
                <TableCell>{seller.email}</TableCell>
                <TableCell>{seller.phone}</TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(seller.id, 'active')}
                        disabled={!!isUpdating}
                      >
                          {isUpdating === seller.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleUpdateStatus(seller.id, 'inactive')}
                        disabled={!!isUpdating}
                      >
                          {isUpdating === seller.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                          Reject
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
