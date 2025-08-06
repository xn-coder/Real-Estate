
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
import { collection, getDocs, query, where, doc, getDoc, Timestamp } from "firebase/firestore"
import type { User as UserType } from "@/types/user"
import type { Appointment } from "@/types/appointment"
import type { Property } from "@/types/property"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type AggregatedVisit = {
  id: string; // Unique key for aggregation
  customer?: UserType;
  partner?: UserType;
  property?: Property;
  visitCount: number;
};

export default function ManageVisitorPage() {
  const { toast } = useToast()
  const router = useRouter();
  const { user } = useUser();
  const [visits, setVisits] = React.useState<AggregatedVisit[]>([])
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
              setVisits([]);
              setIsLoading(false);
              return;
          }
          appointmentsQuery = query(appointmentsCollection, where("propertyId", "in", sellerPropertyIds), where("status", "==", "Completed"));
      } else {
        setVisits([]);
        setIsLoading(false);
        return;
      }
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const detailedVisitsPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
        const appointmentData = appointmentDoc.data() as Appointment;
        const customerId = (appointmentData as any).customerId;
        
        const [customerDoc, partnerDoc, propertyDoc] = await Promise.all([
            customerId ? getDoc(doc(db, "users", customerId)) : null,
            getDoc(doc(db, "users", appointmentData.partnerId)),
            getDoc(doc(db, "properties", appointmentData.propertyId))
        ]);

        return {
            id: appointmentDoc.id,
            customer: customerDoc?.exists() ? { id: customerDoc.id, ...customerDoc.data() } as UserType : undefined,
            partner: partnerDoc.exists() ? { id: partnerDoc.id, ...partnerDoc.data() } as UserType : undefined,
            property: propertyDoc.exists() ? { id: propertyDoc.id, ...propertyDoc.data() } as Property : undefined,
        };
      });

      const detailedVisits = await Promise.all(detailedVisitsPromises);

      const aggregatedVisitsMap = new Map<string, AggregatedVisit>();

      for (const visit of detailedVisits) {
          if (!visit.customer || !visit.partner || !visit.property) continue;

          const key = `${visit.customer.id}-${visit.partner.id}-${visit.property.id}`;
          if (aggregatedVisitsMap.has(key)) {
              const existing = aggregatedVisitsMap.get(key)!;
              existing.visitCount += 1;
          } else {
              aggregatedVisitsMap.set(key, {
                  id: key,
                  customer: visit.customer,
                  partner: visit.partner,
                  property: visit.property,
                  visitCount: 1,
              });
          }
      }

      setVisits(Array.from(aggregatedVisitsMap.values()));

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
              <TableHead>Associated Partner</TableHead>
              <TableHead>Property Visited</TableHead>
              <TableHead>No. of Visits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : visits.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No confirmed visits found.
                    </TableCell>
                </TableRow>
            ) : visits.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {visit.customer?.name || 'N/A'}
                    </div>
                    {visit.customer && <div className="text-xs text-muted-foreground font-mono pl-6">{visit.customer.id}</div>}
                </TableCell>
                <TableCell>
                     <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {visit.partner?.name || 'N/A'}
                    </div>
                     {visit.partner && <div className="text-xs text-muted-foreground font-mono pl-6">{visit.partner.id}</div>}
                </TableCell>
                <TableCell>
                    {visit.property ? (
                         <Button variant="link" asChild className="p-0 h-auto font-normal">
                           <Link href={`/listings/${visit.property.id}`}>
                                <Building className="mr-2 h-4 w-4" />
                                {visit.property.catalogTitle}
                            </Link>
                        </Button>
                    ) : (
                        'Property not found'
                    )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{visit.visitCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={!visit.customer} onClick={() => router.push(`/manage-customer/${visit.customer?.id}`)}>
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
