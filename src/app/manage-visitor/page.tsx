
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
import { Loader2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, documentId } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import type { Appointment } from "@/types/appointment"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import type { Lead } from "@/types/lead"

type Visitor = {
  id: string;
  name: string;
  visitCount: number;
};

export default function ManageVisitorPage() {
  const { toast } = useToast()
  const router = useRouter();
  const { user } = useUser();
  const [visitors, setVisitors] = React.useState<Visitor[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchVisitors = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true)
    try {
      const appointmentsCollection = collection(db, "appointments");
      const usersCollection = collection(db, "users");
      
      let appointmentsQuery;

      if (user.role === 'admin') {
        appointmentsQuery = query(appointmentsCollection);
      } else if (user.role === 'seller') {
          const propertiesCollection = collection(db, "properties");
          const sellerPropertiesQuery = query(propertiesCollection, where("email", "==", user.email));
          const sellerPropertiesSnapshot = await getDocs(sellerPropertiesQuery);
          const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(doc => doc.id);

          if (sellerPropertyIds.length === 0) {
              setVisitors([]);
              setIsLoading(false);
              return;
          }
          appointmentsQuery = query(appointmentsCollection, where("propertyId", "in", sellerPropertyIds));
      } else {
        // No access for other roles for now
        setVisitors([]);
        setIsLoading(false);
        return;
      }
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnapshot.docs.map(doc => doc.data() as Appointment);

      if (appointments.length === 0) {
        setVisitors([]);
        setIsLoading(false);
        return;
      }
      
      // Aggregate visits by customer ID
      const visitsByCustomer = new Map<string, Set<string>>();
      const leadIds = [...new Set(appointments.map(a => a.leadId))];
      
      if(leadIds.length === 0) {
        setVisitors([]);
        setIsLoading(false);
        return;
      }

      // Fetch all relevant leads in one go
      const leadsQuery = query(collection(db, 'leads'), where(documentId(), 'in', leadIds));
      const leadsSnapshot = await getDocs(leadsQuery);
      const leadsMap = new Map<string, Lead>();
      leadsSnapshot.docs.forEach(doc => leadsMap.set(doc.id, doc.data() as Lead));

      for (const appointment of appointments) {
        const lead = leadsMap.get(appointment.leadId);
        if (!lead || !lead.customerId) continue;

        const customerId = lead.customerId;
        if (!visitsByCustomer.has(customerId)) {
          visitsByCustomer.set(customerId, new Set());
        }
        visitsByCustomer.get(customerId)?.add(appointment.propertyId);
      }
      
      const customerIds = Array.from(visitsByCustomer.keys());
      if (customerIds.length === 0) {
        setVisitors([]);
        setIsLoading(false);
        return;
      }
      
      const customerQuery = query(usersCollection, where(documentId(), "in", customerIds));
      const customerSnapshot = await getDocs(customerQuery);
      
      const visitorList = customerSnapshot.docs.map(doc => {
        const customer = doc.data() as CustomerUser;
        return {
          id: customer.id,
          name: customer.name,
          visitCount: visitsByCustomer.get(customer.id)?.size || 0,
        };
      });

      setVisitors(visitorList.sort((a,b) => b.visitCount - a.visitCount));

    } catch (error) {
      console.error("Error fetching visitors:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch visitor data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  React.useEffect(() => {
    if (user) {
        fetchVisitors()
    }
  }, [user, fetchVisitors])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Visitors</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor Name</TableHead>
              <TableHead>Visitor ID</TableHead>
              <TableHead className="text-center">No. of Visits</TableHead>
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
            ) : visitors.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No visitor data found.
                    </TableCell>
                </TableRow>
            ) : visitors.map((visitor) => (
              <TableRow key={visitor.id}>
                <TableCell className="font-medium">{visitor.name}</TableCell>
                <TableCell className="font-mono text-xs">{visitor.id}</TableCell>
                <TableCell className="text-center font-semibold">{visitor.visitCount}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/manage-customer/${visitor.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Profile</span>
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
