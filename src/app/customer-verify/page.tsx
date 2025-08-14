
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
import { Loader2, User, Eye, Search, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import type { UserDocument } from "@/types/document"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

export default function CustomerVerifyPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [customers, setCustomers] = React.useState<CustomerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [selectedCustomerDocs, setSelectedCustomerDocs] = React.useState<UserDocument[]>([])

  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("status", "==", "pending_verification"))
      const snapshot = await getDocs(q)
      const customerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerUser))
      setCustomers(customerList)
    } catch (error) {
      console.error("Error fetching customers for verification:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customers for verification.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleUpdateStatus = async (customerId: string, newStatus: 'active' | 'rejected') => {
    setIsUpdating(customerId)
    try {
        const userRef = doc(db, "users", customerId);
        if (newStatus === 'rejected') {
            await deleteDoc(userRef);
            toast({ title: "Success", description: `Customer application has been rejected and removed.`});
        } else {
            await updateDoc(userRef, { status: newStatus });
            toast({ title: "Success", description: `Customer status updated to ${newStatus}.`});
        }
        fetchCustomers();
    } catch (error) {
        console.error("Error updating customer status:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update customer status.'});
    } finally {
        setIsUpdating(null);
    }
  }

  const handleViewDocuments = async (customerId: string) => {
    try {
      const docsRef = collection(db, `users/${customerId}/documents`);
      const snapshot = await getDocs(docsRef);
      const docsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserDocument));
      setSelectedCustomerDocs(docsList);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load documents." });
    }
  }


  const filteredCustomers = React.useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Customer Verification</h1>
      </div>
       <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            className="pl-8 sm:w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
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
            ) : filteredCustomers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No customers awaiting verification.
                    </TableCell>
                </TableRow>
            ) : filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDocuments(customer.id)} disabled={!!isUpdating}>
                        <Eye className="mr-2 h-4 w-4" /> View Documents
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(customer.id, 'active')} disabled={!!isUpdating}>
                        {isUpdating === customer.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Verify
                    </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(customer.id, 'rejected')} disabled={!!isUpdating}>
                         {isUpdating === customer.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Reject
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Customer Documents</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
             {selectedCustomerDocs.length > 0 ? (
                selectedCustomerDocs.map(doc => (
                    <Card key={doc.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Image src={doc.fileUrl} alt={doc.title} width={500} height={300} className="rounded-md object-contain w-full h-auto" />
                          </a>
                      </CardContent>
                    </Card>
                ))
            ) : (
                <p className="text-sm text-center text-muted-foreground py-8">No documents were uploaded for this customer.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
