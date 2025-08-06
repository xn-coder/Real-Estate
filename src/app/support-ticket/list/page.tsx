
'use client'

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import type { SupportTicket } from "@/types/team"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

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

    const handleStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
        try {
            await updateDoc(doc(db, "support_tickets", ticketId), { status, updatedAt: Timestamp.now() });
            toast({ title: "Status Updated", description: `Ticket status changed to ${status}.`});
            fetchTickets();
        } catch(error) {
            console.error("Error updating status", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update ticket status." });
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Open')}>Mark as Open</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'In Progress')}>Mark as In Progress</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Closed')}>Mark as Closed</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
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
