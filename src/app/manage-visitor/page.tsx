
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
import { Loader2, Eye, Building, User, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import type { User as UserType } from "@/types/user"
import type { Appointment } from "@/types/appointment"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import type { Lead } from "@/types/lead"

type VisitorSummary = {
  customer: UserType;
  partnerNames: Set<string>;
  totalVisits: number;
  visitedProperties: Set<string>;
};

export default function ManageVisitorPage() {
  const { toast } = useToast()
  const router = useRouter();
  const { user } = useUser();
  const [visitorSummaries, setVisitorSummaries] = React.useState<VisitorSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchConfirmedVisits = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true)
    try {
      const appointmentsCollection = collection(db, "appointments");
      
      let appointmentsQuery;
      
      if (user.role === 'admin') {
        appointmentsQuery = query(appointmentsCollection, where("status", "==", "Completed"));
      } else if (user.role === 'seller') {
          const propertiesCollection = collection(db, "properties");
          const sellerPropertiesQuery = query(propertiesCollection, where("email", "==", user.email));
          const sellerPropertiesSnapshot = await getDocs(sellerPropertiesQuery);
          const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(d => d.id);

          if (sellerPropertyIds.length === 0) {
              setVisitorSummaries([]);
              setIsLoading(false);
              return;
          }
          appointmentsQuery = query(appointmentsCollection, where("propertyId", "in", sellerPropertyIds), where("status", "==", "Completed"));
      } else {
        setVisitorSummaries([]);
        setIsLoading(false);
        return;
      }
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const summaries = new Map<string, VisitorSummary>();
      
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointmentData = appointmentDoc.data() as Appointment;
        const customerId = (appointmentData as any).customerId;

        if (!customerId) continue;

        let summary = summaries.get(customerId);

        if (!summary) {
            const customerDoc = await getDoc(doc(db, "users", customerId));
            if (customerDoc.exists()) {
                summary = {
                    customer: { id: customerDoc.id, ...customerDoc.data() } as UserType,
                    partnerNames: new Set(),
                    totalVisits: 0,
                    visitedProperties: new Set(),
                };
            } else {
                continue; // Skip if customer not found
            }
        }
        
        const partnerDoc = await getDoc(doc(db, "users", appointmentData.partnerId));
        if (partnerDoc.exists()) {
            summary.partnerNames.add(partnerDoc.data().name);
        }
        
        summary.visitedProperties.add(appointmentData.propertyId);
        summary.totalVisits = summary.visitedProperties.size;
        
        summaries.set(customerId, summary);
      }

      setVisitorSummaries(Array.from(summaries.values()));

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
        fetchConfirmedVisits()
    }
  }, [user, fetchConfirmedVisits])

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
              <TableHead>Associated Partners</TableHead>
              <TableHead className="text-center">No. of Properties Visited</TableHead>
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
            ) : visitorSummaries.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No confirmed visits found.
                    </TableCell>
                </TableRow>
            ) : visitorSummaries.map((summary) => (
              <TableRow key={summary.customer.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {summary.customer.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono pl-6">{summary.customer.id}</div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {Array.from(summary.partnerNames).join(', ')}
                    </div>
                </TableCell>
                <TableCell className="text-center font-medium">{summary.totalVisits}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/manage-customer/${summary.customer.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Customer Profile</span>
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
