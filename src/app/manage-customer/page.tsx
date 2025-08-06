
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
import { Loader2, Eye, MessageSquare, PlusCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, documentId } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import type { Lead } from "@/types/lead"

const statusColors: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: 'default',
  inactive: 'secondary',
};

export default function ManageCustomerPage() {
  const { toast } = useToast()
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [customers, setCustomers] = React.useState<CustomerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const partnerIdFilter = searchParams.get('partnerId');

  const fetchCustomers = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true)
    try {
        let customerQuery;
        const usersCollection = collection(db, "users");
        const leadsCollection = collection(db, "leads");

        if (partnerIdFilter) {
            // If a partnerId is provided in the URL, fetch customers for that partner
            const partnerLeadsQuery = query(leadsCollection, where("partnerId", "==", partnerIdFilter));
            const partnerLeadsSnapshot = await getDocs(partnerLeadsQuery);
            const customerIds = [...new Set(partnerLeadsSnapshot.docs.map(doc => (doc.data() as Lead).customerId).filter(id => id))];

             if (customerIds.length === 0) {
                 setCustomers([]);
                 setIsLoading(false);
                 return;
            }
            customerQuery = query(usersCollection, where(documentId(), "in", customerIds));
        }
        else if (user.role === 'admin') {
            customerQuery = query(usersCollection, where("role", "==", "customer"));
        } else if (user.role === 'seller') {
            const propertiesCollection = collection(db, "properties");
            const sellerPropertiesQuery = query(propertiesCollection, where("email", "==", user.email));
            const sellerPropertiesSnapshot = await getDocs(sellerPropertiesQuery);
            const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(doc => doc.id);
            
            if (sellerPropertyIds.length === 0) {
                 setCustomers([]);
                 setIsLoading(false);
                 return;
            }
            
            const leadsQuery = query(leadsCollection, where("propertyId", "in", sellerPropertyIds));
            const leadsSnapshot = await getDocs(leadsQuery);
            const customerIds = [...new Set(leadsSnapshot.docs.map(doc => (doc.data() as Lead).customerId).filter(id => id))];

            if (customerIds.length === 0) {
                 setCustomers([]);
                 setIsLoading(false);
                 return;
            }
            customerQuery = query(usersCollection, where(documentId(), "in", customerIds));

        } else { // Partner roles
            const partnerLeadsQuery = query(leadsCollection, where("partnerId", "==", user.id));
            const partnerLeadsSnapshot = await getDocs(partnerLeadsQuery);
            const customerIds = [...new Set(partnerLeadsSnapshot.docs.map(doc => (doc.data() as Lead).customerId).filter(id => id))];

             if (customerIds.length === 0) {
                 setCustomers([]);
                 setIsLoading(false);
                 return;
            }
            customerQuery = query(usersCollection, where(documentId(), "in", customerIds));
        }

      const customerSnapshot = await getDocs(customerQuery)
      const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerUser))
      setCustomers(customerList)
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customers.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast, partnerIdFilter])

  React.useEffect(() => {
    if(user){
        fetchCustomers()
    }
  }, [user, fetchCustomers])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Customers</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
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
            ) : customers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No customers found.
                    </TableCell>
                </TableRow>
            ) : customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                 <TableCell>
                    <Badge variant={statusColors[customer.status || 'active'] || 'default'} className="capitalize">
                        {customer.status || 'active'}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{customer.email}</TableCell>
                <TableCell className="hidden md:table-cell">{customer.phone}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/manage-customer/${customer.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Profile</span>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => router.push(`/send-message?recipientId=${customer.id}&type=to_customer`)}>
                        <MessageSquare className="h-4 w-4" />
                         <span className="sr-only">Send Message</span>
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
