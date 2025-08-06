
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where, Timestamp, orderBy } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, PlusCircle, Users, Send, UserPlus, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUser } from "@/hooks/use-user"
import type { TeamMember } from "@/types/user"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

const addableRoles: Record<string, string[]> = {
  franchisee: ['channel', 'associate', 'super_affiliate', 'affiliate'],
  channel: ['associate', 'super_affiliate', 'affiliate'],
  associate: ['super_affiliate', 'affiliate'],
};

export default function TeamManagementPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [allRequestablePartners, setAllRequestablePartners] = React.useState<TeamMember[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");


  const canManageTeam = user?.role && ['franchisee', 'channel', 'associate'].includes(user.role);

  const fetchData = React.useCallback(async () => {
    if (!user || !canManageTeam) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const requestsCollection = collection(db, "team_requests");

      // Fetch existing team members
      const teamQuery = query(usersCollection, where("teamLeadId", "==", user.id));
      const teamSnapshot = await getDocs(teamQuery);
      const membersList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setTeamMembers(membersList);

      // Fetch requestable partners
      const availableRoles = addableRoles[user.role as keyof typeof addableRoles] || [];
      if (availableRoles.length > 0) {
        const requestableQuery = query(
            usersCollection, 
            where("role", "in", availableRoles), 
            orderBy("createdAt", "desc")
        );
        const requestableSnapshot = await getDocs(requestableQuery);
        const requestableList = requestableSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as TeamMember))
            // Filter out partners who already have a team lead or are the user themselves
            .filter(p => !p.teamLeadId && p.id !== user.id); 
        setAllRequestablePartners(requestableList);
      }

      // Fetch pending request count
      const pendingRequestsQuery = query(requestsCollection, where("requesterId", "==", user.id), where("status", "==", "pending"));
      const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);
      setPendingRequestCount(pendingRequestsSnapshot.size);

    } catch (error) {
      console.error("Error fetching team data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch team data." });
    } finally {
      setIsLoading(false);
    }
  }, [user, canManageTeam, toast]);

  React.useEffect(() => {
    if(user) {
        fetchData();
    }
  }, [user, fetchData]);

  const handleSendRequest = async (partner: TeamMember) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, "team_requests"), {
            requesterId: user.id,
            requesterName: user.name,
            recipientId: partner.id,
            recipientName: partner.name,
            status: "pending",
            requestedAt: Timestamp.now(),
        });
        toast({ title: "Request Sent", description: `Your request to add ${partner.name} has been sent.` });
        fetchData(); // Refresh data
    } catch(error) {
        console.error("Error sending request:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to send team request." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const partnersToDisplay = React.useMemo(() => {
    if (searchTerm) {
        return allRequestablePartners.filter(partner => 
            partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            partner.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return allRequestablePartners.slice(0, 8);
  }, [allRequestablePartners, searchTerm]);


  if (isUserLoading) {
    return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!canManageTeam) {
    return (
        <div className="flex-1 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to manage a team.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Team Management</h1>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/team-management/requests">
                    Pending Requests 
                    {pendingRequestCount > 0 && <Badge className="ml-2">{pendingRequestCount}</Badge>}
                </Link>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" /> Request Partner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Request Partner to Join Team</DialogTitle>
                  <DialogDescription>Select a partner from the list to send them a request.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or ID to see all available partners..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Partner</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : partnersToDisplay.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No partners available to request.</TableCell></TableRow>
                            ) : (
                                partnersToDisplay.map(partner => (
                                    <TableRow key={partner.id}>
                                        <TableCell>
                                            <div className="font-medium">{partner.name}</div>
                                            <div className="text-sm text-muted-foreground font-mono">{partner.id}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{roleNameMapping[partner.role]}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleSendRequest(partner)} disabled={isSubmitting}>
                                                <Send className="mr-2 h-4 w-4" /> Request
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>A list of partners you have added to your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : teamMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No team members found.</TableCell></TableRow>
                ) : (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell><Badge variant="outline">{roleNameMapping[member.role]}</Badge></TableCell>
                      <TableCell><Badge className="capitalize">{member.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
