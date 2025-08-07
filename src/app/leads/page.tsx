
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
import { MoreHorizontal, Loader2, Calendar as CalendarIcon, Eye, Building, User as UserIcon, Send, RefreshCw } from "lucide-react"
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
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { createAppointment } from "@/services/appointment-service"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'New': 'default',
  'Contacted': 'secondary',
  'Qualified': 'outline',
  'Lost': 'destructive',
  'Forwarded': 'outline',
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
  const [isScheduling, setIsScheduling] = React.useState(false);

  // State for "Send to Partner" dialog
  const [isSendToPartnerDialogOpen, setIsSendToPartnerDialogOpen] = React.useState(false);
  const [selectedLeadForSending, setSelectedLeadForSending] = React.useState<Lead | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<User[]>([]);
  const [selectedPartnerForLead, setSelectedPartnerForLead] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);


  const canSendToPartner = user?.role && ['associate', 'channel', 'franchisee'].includes(user.role);

  const fetchLeads = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const leadsCollection = collection(db, "leads");
      let q;

      if (user.role === 'admin') {
        q = query(leadsCollection);
      } else if (user.role === 'seller') {
        const propertiesCollection = collection(db, "properties");
        const sellerPropertiesQuery = query(propertiesCollection, where("email", "==", user.email));
        const sellerPropertiesSnapshot = await getDocs(sellerPropertiesQuery);
        const sellerPropertyIds = sellerPropertiesSnapshot.docs.map(doc => doc.id);

        if (sellerPropertyIds.length === 0) {
            setLeads([]);
            setIsLoading(false);
            return;
        }
        q = query(leadsCollection, where("propertyId", "in", sellerPropertyIds));
      } else { // Partner roles
        q = query(leadsCollection, where("partnerId", "==", user.id), where("isCopy", "==", undefined));
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

  const fetchTeamMembers = React.useCallback(async () => {
    if (!user || !canSendToPartner) return;
    try {
      const usersCollection = collection(db, "users");
      const teamQuery = query(usersCollection, where("teamLeadId", "==", user.id));
      const teamSnapshot = await getDocs(teamQuery);
      const membersList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setTeamMembers(membersList);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch team members." });
    }
  }, [user, canSendToPartner, toast]);


  React.useEffect(() => {
    if(user) {
        fetchLeads();
        if (canSendToPartner) {
            fetchTeamMembers();
        }
    }
  }, [user, fetchLeads, canSendToPartner, fetchTeamMembers]);

  const handleScheduleClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleVisit = async () => {
    if (!visitDate || !selectedLead || !user) return;
    setIsScheduling(true);
    try {
        await createAppointment({
            leadId: selectedLead.id,
            propertyId: selectedLead.propertyId,
            partnerId: user.id,
            visitDate,
        });
        toast({ title: "Visit Scheduled", description: "The site visit has been successfully scheduled." });
        setIsScheduleDialogOpen(false);
    } catch (error: any) {
        console.error("Error scheduling visit:", error);
        toast({ variant: "destructive", title: "Scheduling Failed", description: error.message });
    } finally {
        setIsScheduling(false);
    }
  };

  const handleSendToPartnerClick = (lead: Lead) => {
    setSelectedLeadForSending(lead);
    setIsSendToPartnerDialogOpen(true);
  };

  const handleSendLeadToPartner = async () => {
    const partner = teamMembers.find(m => m.id === selectedPartnerForLead);
    if (!selectedPartnerForLead || !selectedLeadForSending || !partner) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a partner.' });
        return;
    }
    setIsSending(true);
    try {
        const { id, ...leadData } = selectedLeadForSending;
        
        const newLeadData = {
            ...leadData,
            partnerId: selectedPartnerForLead,
            isCopy: true,
            originalLeadId: id,
        };

        const leadCopyRef = await addDoc(collection(db, 'leads'), newLeadData);

        const originalLeadRef = doc(db, 'leads', id);
        await updateDoc(originalLeadRef, {
            status: 'Forwarded',
            forwardedTo: {
                partnerId: selectedPartnerForLead,
                partnerName: partner.name,
                leadCopyId: leadCopyRef.id
            }
        });
        
        toast({ title: 'Lead Forwarded', description: `Lead has been forwarded to ${partner.name}.` });
        fetchLeads(); // Refresh leads
        setIsSendToPartnerDialogOpen(false);
    } catch (error) {
        console.error("Error forwarding lead:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to forward the lead.' });
    } finally {
        setIsSending(false);
    }
  };
  
  const handleRetakeLead = async (lead: Lead) => {
    if (!lead.forwardedTo?.leadCopyId) return;
    setIsSending(true);
    try {
        const leadCopyRef = doc(db, 'leads', lead.forwardedTo.leadCopyId);
        await deleteDoc(leadCopyRef);

        const originalLeadRef = doc(db, 'leads', lead.id);
        await updateDoc(originalLeadRef, {
            status: 'New', // Or whatever its original status was
            forwardedTo: null,
        });
        
        toast({ title: 'Lead Retaken', description: `Lead has been retaken from ${lead.forwardedTo.partnerName}.` });
        fetchLeads();

    } catch(error) {
        console.error("Error retaking lead:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to retake the lead.' });
    } finally {
        setIsSending(false);
    }
  }


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
                        {lead.status === 'Forwarded' && (
                            <p className="text-xs text-muted-foreground">to {lead.forwardedTo?.partnerName}</p>
                        )}
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
                        <DropdownMenuItem onSelect={() => router.push(`/manage-customer/${lead.customerId}`)}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            View Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleClick(lead)} disabled={lead.status === 'Forwarded'}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Schedule Visit
                        </DropdownMenuItem>
                        {canSendToPartner && (
                            lead.status === 'Forwarded' ? (
                                <DropdownMenuItem onSelect={() => handleRetakeLead(lead)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Retake Lead
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onSelect={() => handleSendToPartnerClick(lead)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send to Partner
                                </DropdownMenuItem>
                            )
                        )}
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
                    <Button onClick={handleScheduleVisit} disabled={isScheduling}>
                        {isScheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Confirm Visit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {/* Send to Partner Dialog */}
        <Dialog open={isSendToPartnerDialogOpen} onOpenChange={setIsSendToPartnerDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Lead to Partner</DialogTitle>
                    <DialogDescription>
                        Select a team member to assign this lead to.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {teamMembers.length > 0 ? (
                        <RadioGroup onValueChange={setSelectedPartnerForLead}>
                             <div className="space-y-2 max-h-60 overflow-y-auto">
                                {teamMembers.map((member) => (
                                    <Label key={member.id} htmlFor={member.id} className="flex items-center gap-3 border rounded-md p-3 cursor-pointer hover:bg-muted">
                                        <RadioGroupItem value={member.id} id={member.id} />
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={member.profileImage} alt={member.name} />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">{member.name}</p>
                                            <p className="text-sm text-muted-foreground">{member.role.replace('_', ' ')}</p>
                                        </div>
                                    </Label>
                                ))}
                            </div>
                        </RadioGroup>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-8">
                            You have no team members to send this lead to.
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSendToPartnerDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendLeadToPartner} disabled={isSending || teamMembers.length === 0}>
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Lead
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
