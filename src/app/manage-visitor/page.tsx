
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
import { Loader2, Eye, Building } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import type { Appointment } from "@/types/appointment"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import { format } from 'date-fns'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"

type ConfirmedVisit = Appointment & {
  customer?: CustomerUser;
  property?: Property;
}

export default function ManageVisitorPage() {
  const { toast } = useToast()
  const router = useRouter();
  const { user } = useUser();
  const [confirmedVisits, setConfirmedVisits] = React.useState<ConfirmedVisit[]>([])
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
          const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(doc => doc.id);

          if (sellerPropertyIds.length === 0) {
              setConfirmedVisits([]);
              setIsLoading(false);
              return;
          }
          appointmentsQuery = query(appointmentsCollection, where("propertyId", "in", sellerPropertyIds), where("status", "==", "Completed"));
      } else {
        setConfirmedVisits([]);
        setIsLoading(false);
        return;
      }
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const visitsPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
        const appointmentData = appointmentDoc.data() as Appointment;
        
        let customerData: CustomerUser | undefined;
        let propertyData: Property | undefined;

        // Fetch Lead to get Customer ID
        const leadDoc = await getDoc(doc(db, "leads", appointmentData.leadId));
        if (leadDoc.exists()) {
            const leadData = leadDoc.data() as Lead;
            if(leadData.customerId) {
                const customerDoc = await getDoc(doc(db, "users", leadData.customerId));
                if (customerDoc.exists()) {
                    customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerUser;
                }
            }
        }

        // Fetch Property
        const propDoc = await getDoc(doc(db, "properties", appointmentData.propertyId));
        if(propDoc.exists()) {
            propertyData = { id: propDoc.id, ...propDoc.data() } as Property;
        }

        return {
            ...appointmentData,
            id: appointmentDoc.id,
            customer: customerData,
            property: propertyData
        };
      });

      const resolvedVisits = await Promise.all(visitsPromises);
      setConfirmedVisits(resolvedVisits.sort((a,b) => (b.visitDate as any).seconds - (a.visitDate as any).seconds));

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
              <TableHead>Property Visited</TableHead>
              <TableHead>Visit Date</TableHead>
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
            ) : confirmedVisits.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No confirmed visits found.
                    </TableCell>
                </TableRow>
            ) : confirmedVisits.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell className="font-medium">{visit.customer?.name || 'N/A'}</TableCell>
                <TableCell>
                    {visit.property ? (
                        <Button variant="link" asChild className="p-0 h-auto font-normal">
                            <Link href={`/listings/${visit.property.id}`}>
                                <Building className="mr-2 h-4 w-4" />
                                {visit.property.catalogTitle}
                            </Link>
                        </Button>
                    ) : (
                        'N/A'
                    )}
                </TableCell>
                <TableCell>{visit.visitDate ? format((visit.visitDate as any).toDate(), "PPP") : 'N/A'}</TableCell>
                <TableCell className="text-right">
                    {visit.customer && (
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/manage-customer/${visit.customer?.id}`)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Profile</span>
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
