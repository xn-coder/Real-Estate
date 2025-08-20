
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
import { Loader2, Eye, Building, User, Users, Search, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore"
import type { User as UserType } from "@/types/user"
import type { Appointment } from "@/types/appointment"
import type { Property } from "@/types/property"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"


type VisitWithProof = {
    date: Date;
    proofUrl?: string;
}

type AggregatedVisit = {
  id: string; // Unique key for aggregation
  appointment: Appointment;
  customer?: UserType;
  partner?: UserType;
  property?: Property;
};

export default function ManageVisitorPage() {
  const { toast } = useToast()
  const router = useRouter();
  const { user } = useUser();
  const [allVisits, setAllVisits] = React.useState<AggregatedVisit[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<Appointment['status'] | 'all'>('all');


  const fetchConfirmedVisits = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true)
    try {
      const appointmentsCollection = collection(db, "appointments");
      
      let appointmentsQuery;
      
      if (user.role === 'admin') {
        appointmentsQuery = query(appointmentsCollection);
      } else if (user.role === 'seller') {
          const propertiesCollection = collection(db, "properties");
          const sellerPropertiesQuery = query(propertiesCollection, where("email", "==", user.email));
          const sellerPropertiesSnapshot = await getDocs(sellerPropertiesQuery);
          const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(d => d.id);

          if (sellerPropertyIds.length === 0) {
              setAllVisits([]);
              setIsLoading(false);
              return;
          }
          appointmentsQuery = query(appointmentsCollection, where("propertyId", "in", sellerPropertyIds));
      } else {
        setAllVisits([]);
        setIsLoading(false);
        return;
      }
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const detailedVisitsPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
        const appointmentData = { id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment;
        
        const [customerDoc, partnerDoc, propertyDoc] = await Promise.all([
            appointmentData.customerId ? getDoc(doc(db, "users", appointmentData.customerId)) : null,
            getDoc(doc(db, "users", appointmentData.partnerId)),
            getDoc(doc(db, "properties", appointmentData.propertyId))
        ]);

        return {
            id: appointmentDoc.id,
            appointment: appointmentData,
            customer: customerDoc?.exists() ? { id: customerDoc.id, ...customerDoc.data() } as UserType : undefined,
            partner: partnerDoc.exists() ? { id: partnerDoc.id, ...partnerDoc.data() } as UserType : undefined,
            property: propertyDoc.exists() ? { id: propertyDoc.id, ...propertyDoc.data() } as Property : undefined,
        };
      });

      const detailedVisits = await Promise.all(detailedVisitsPromises);
      setAllVisits(detailedVisits);

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
  }, [user, toast]);
  
  const handleUpdateStatus = async (appointmentId: string, leadId: string, status: 'Completed' | 'Rejected') => {
    setIsUpdating(true);
    try {
        const batch = writeBatch(db);
        
        const appointmentRef = doc(db, "appointments", appointmentId);
        batch.update(appointmentRef, { status });

        // If visit is approved, update lead status to 'Processing'
        if (status === 'Completed' && leadId) {
            const leadRef = doc(db, "leads", leadId);
            batch.update(leadRef, { status: 'Processing' });
        }
        
        await batch.commit();

        toast({ title: "Success", description: `Visit has been ${status.toLowerCase()} and lead status updated.` });
        fetchConfirmedVisits();
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Failed to update visit status." });
    } finally {
        setIsUpdating(false);
    }
  }

  React.useEffect(() => {
    if (user) {
        fetchConfirmedVisits()
    }
  }, [user, fetchConfirmedVisits]);

  const filteredVisits = React.useMemo(() => {
    return allVisits
      .filter(visit => {
        if (activeFilter === 'all') return true;
        return visit.appointment.status.toLowerCase() === activeFilter.toLowerCase();
      })
      .filter(visit => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          visit.customer?.name.toLowerCase().includes(term) ||
          visit.partner?.name.toLowerCase().includes(term) ||
          visit.property?.catalogTitle.toLowerCase().includes(term)
        );
      });
  }, [allVisits, searchTerm, activeFilter]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Visitors</h1>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by visitor, partner, or property..."
            className="pl-8 sm:w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as Appointment['status'] | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="Pending Verification">Pending Verification</TabsTrigger>
            <TabsTrigger value="Completed">Completed</TabsTrigger>
            <TabsTrigger value="Cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor Name</TableHead>
              <TableHead>Associated Partner</TableHead>
              <TableHead>Property Visited</TableHead>
              <TableHead>Status</TableHead>
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
            ) : filteredVisits.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No visits found.
                    </TableCell>
                </TableRow>
            ) : filteredVisits.map((visit) => (
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
                    <Badge variant={visit.appointment.status === 'Completed' ? 'default' : 'secondary'}>
                        {visit.appointment.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {visit.appointment.status === 'Pending Verification' ? (
                        <div className="flex gap-2 justify-end">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Eye className="mr-2 h-4 w-4"/> View Proof
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Visit Proof</DialogTitle>
                                    </DialogHeader>
                                    <div className="p-4 flex justify-center">
                                        {visit.appointment.visitProofUrl ? (
                                            <Image src={visit.appointment.visitProofUrl} alt="Visit proof" width={600} height={800} className="max-w-full max-h-[70vh] h-auto rounded-lg object-contain" />
                                        ) : <p>No proof uploaded.</p>}
                                    </div>
                                    <DialogFooter className="gap-2 sm:justify-between">
                                        <Button variant="destructive" onClick={() => handleUpdateStatus(visit.id, visit.appointment.leadId, 'Rejected')} disabled={isUpdating}>
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                        <Button onClick={() => handleUpdateStatus(visit.id, visit.appointment.leadId, 'Completed')} disabled={isUpdating}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">No action needed</span>
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
