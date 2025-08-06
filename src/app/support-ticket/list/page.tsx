
'use client'

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Mail, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import type { SupportTicket } from "@/types/team"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const statusColors: Record<SupportTicket['status'], 'default' | 'secondary' | 'destructive'> = {
  'Open': 'default',
  'In Progress': 'secondary',
  'Closed': 'destructive',
};

export default function ManageSupportTicketsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);
    const [currentStatus, setCurrentStatus] = React.useState<SupportTicket['status']>('Open');
    const [resolutionDetails, setResolutionDetails] = React.useState("");
    const [isUpdating, setIsUpdating] = React.useState(false);

    const fetchTickets = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const ticketsRef = collection(db, "support_tickets");
            const q = query(ticketsRef);
            const snapshot = await getDocs(q);
            const ticketsList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as SupportTicket));
            setTickets(ticketsList.sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()));
        } catch(error) {
            console.error("Error fetching support tickets", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch support tickets." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleManageClick = (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setCurrentStatus(ticket.status);
        setResolutionDetails(ticket.resolutionDetails || "");
        setIsManageDialogOpen(true);
    }
    
    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;
        setIsUpdating(true);
        try {
            await updateDoc(doc(db, "support_tickets", selectedTicket.id), { 
                status: currentStatus,
                resolutionDetails: resolutionDetails,
                updatedAt: Timestamp.now(),
            });
            toast({ title: "Ticket Updated", description: `Ticket has been updated successfully.`});
            fetchTickets();
            setIsManageDialogOpen(false);
        } catch(error) {
            console.error("Error updating ticket", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update ticket." });
        } finally {
            setIsUpdating(false);
        }
    }


    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Support Tickets</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>View and manage all submitted support tickets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : tickets.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No support tickets found.</TableCell></TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-medium">{ticket.userName}</TableCell>
                                            <TableCell>{ticket.subject}</TableCell>
                                            <TableCell><Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`mailto:${ticket.userName}`)}>
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleManageClick(ticket)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Ticket</DialogTitle>
                        <DialogDescription>{selectedTicket?.subject}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 border rounded-md bg-muted text-sm">
                            <p className="font-semibold mb-2">Original Request from {selectedTicket?.userName}:</p>
                            <p>{selectedTicket?.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Related to: {selectedTicket?.category} - {selectedTicket?.itemTitle || 'N/A'}
                            </p>
                        </div>
                        
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={currentStatus} onValueChange={(value) => setCurrentStatus(value as SupportTicket['status'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="resolution">Resolution Details / Notes</Label>
                            <Textarea 
                                id="resolution"
                                value={resolutionDetails}
                                onChange={(e) => setResolutionDetails(e.target.value)}
                                placeholder="Add your response or resolution notes here..."
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateTicket} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Update Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
