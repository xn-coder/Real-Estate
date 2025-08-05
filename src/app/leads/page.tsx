
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
import { MoreHorizontal, Loader2, Calendar as CalendarIcon, Eye, Building } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { createAppointment } from "@/services/appointment-service"
import { useRouter } from "next/navigation"
import Link from "next/link"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'New': 'default',
  'Contacted': 'secondary',
  'Qualified': 'outline',
  'Lost': 'destructive',
}

export default function LeadsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [visitDate, setVisitDate] = React.useState<Date | undefined>(new Date());

  const fetchLeads = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const leadsCollection = collection(db, "leads");
      let q;
      if (user.role === 'admin' || user.role === 'seller') {
        q = query(leadsCollection);
      } else {
        q = query(leadsCollection, where("partnerId", "==", user.id));
      }
      const snapshot = await getDocs(q);
      const leadsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as Timestamp).toDate(),
          } as Lead;
      });
      setLeads(leadsData.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leads.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleScheduleClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleVisit = async () => {
    if (!visitDate || !selectedLead || !user) return;
    try {
        await createAppointment({
            leadId: selectedLead.id,
            propertyId: selectedLead.propertyId,
            partnerId: user.id,
            visitDate,
        });
        toast({ title: "Visit Scheduled", description: "The site visit has been successfully scheduled." });
        setIsScheduleDialogOpen(false);
    } catch (error) {
        console.error("Error scheduling visit:", error);
        toast({ variant: "destructive", title: "Scheduling Failed", description: "Could not schedule the visit." });
    }
  };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Leads</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : leads.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No leads found.
                    </TableCell>
                </TableRow>
            ) : (
                leads.map((lead) => (
                <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                        <Button variant="link" asChild className="p-0 h-auto">
                           <Link href={`/listings/${lead.propertyId}`}>
                                <Building className="mr-2 h-4 w-4" />
                                {lead.propertyId}
                            </Link>
                        </Button>
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                    <Badge variant={statusColors[lead.status] || 'default'}>{lead.status}</Badge>
                    </TableCell>
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
                        <DropdownMenuItem onSelect={() => router.push(`/listings/${lead.propertyId}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Property
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleClick(lead)}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Schedule Visit
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule a Site Visit</DialogTitle>
                    <DialogDescription>
                       Select a date to schedule a visit for {selectedLead?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={visitDate}
                        onSelect={setVisitDate}
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleScheduleVisit}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Confirm Visit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
