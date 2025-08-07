
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where, Timestamp, orderBy, onSnapshot, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, UserPlus, Search, Send, UserRoundPlus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUser } from "@/hooks/use-user"
import type { User as PartnerUser } from "@/types/user"
import { Badge } from "@/components/ui/badge"
import { getAvailablePartners } from "@/services/team-service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function TeamManagementPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<PartnerUser[]>([]);
  const [allRequestablePartners, setAllRequestablePartners] = React.useState<PartnerUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null);

  const canManageTeam = user?.role && ['franchisee', 'channel', 'associate'].includes(user.role);

  const fetchData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const usersCollection = collection(db, "users");
  
        // Fetch existing team members
        const teamQuery = query(usersCollection, where("teamLeadId", "==", user.id));
        const teamSnapshot = await getDocs(teamQuery);
        const membersList = teamSnapshot.docs.map(doc => {
            const data = doc.data();
            if (data.dob && data.dob instanceof Timestamp) {
                data.dob = data.dob.toDate().toISOString() as any;
            }
            if (data.createdAt && data.createdAt instanceof Timestamp) {
                data.createdAt = data.createdAt.toDate().toISOString() as any;
            }
            return { id: doc.id, ...data } as PartnerUser
        });
        setTeamMembers(membersList);
  
        // Fetch all partners that can be requested via server action
        const availablePartners = await getAvailablePartners(user.id, user.role);
        setAllRequestablePartners(availablePartners);
      
      } catch (error) {
        console.error("Error fetching team data:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch team data." });
      } finally {
        setIsLoading(false);
      }
  }, [user, toast]);

  React.useEffect(() => {
    if(user && canManageTeam) {
        fetchData();
    } else if (!isUserLoading) {
        setIsLoading(false);
    }
  }, [user, canManageTeam, isUserLoading, fetchData]);


  const handleAddPartner = async () => {
    if (!user || !selectedPartner) return;
    setIsSubmitting(true);
    try {
        const partnerDocRef = doc(db, "users", selectedPartner.id);
        await updateDoc(partnerDocRef, {
            teamLeadId: user.id
        });

        toast({ title: "Partner Added", description: `${selectedPartner.name} has been added to your team.` });
        fetchData(); // Refresh data
        setIsDialogOpen(false); // Close dialog
        setSelectedPartner(null); // Reset selection
    } catch(error) {
        console.error("Error adding partner:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add partner to team." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const partnersToDisplay = React.useMemo(() => {
    if (!searchTerm) return [];
    return allRequestablePartners.filter(partner => 
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allRequestablePartners, searchTerm]);

  const handleSelectPartner = (partner: PartnerUser) => {
    setSelectedPartner(partner);
    setSearchTerm("");
  }


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
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setSelectedPartner(null);
                    setSearchTerm("");
                }
            }}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" /> Add Partner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add Partner to Team</DialogTitle>
                  <DialogDescription>Select a partner from the list to add them to your team.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Partner</label>
                    {selectedPartner ? (
                        <div className="flex items-center gap-4 p-2 border rounded-md">
                            <Avatar>
                                <AvatarImage src={selectedPartner.profileImage} />
                                <AvatarFallback>{selectedPartner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium">{selectedPartner.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedPartner.email}</p>
                            </div>
                            <Button variant="ghost" onClick={() => setSelectedPartner(null)}>Change</Button>
                        </div>
                    ) : (
                        <div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search for a partner by name or email..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {searchTerm && (
                                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                    ) : partnersToDisplay.length > 0 ? partnersToDisplay.map(p => (
                                        <div key={p.id} onClick={() => handleSelectPartner(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                            {p.name} ({p.email})
                                        </div>
                                    )) : <p className="p-4 text-sm text-center text-muted-foreground">No partners found.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleAddPartner} disabled={isSubmitting || !selectedPartner}>
                        <UserRoundPlus className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Adding..." : "Add to Team"}
                    </Button>
                </DialogFooter>
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
