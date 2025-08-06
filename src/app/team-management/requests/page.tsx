
'use client'

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import type { TeamRequest } from "@/types/team"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

export default function TeamRequestsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [incomingRequests, setIncomingRequests] = React.useState<TeamRequest[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isResponding, setIsResponding] = React.useState<string | null>(null);

    const fetchRequests = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const requestsRef = collection(db, "team_requests");
            const q = query(requestsRef, where("recipientId", "==", user.id), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            const requests = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as TeamRequest));
            setIncomingRequests(requests);
        } catch(error) {
            console.error("Error fetching team requests", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch incoming team requests." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user, fetchRequests]);

    const handleResponse = async (request: TeamRequest, newStatus: 'accepted' | 'rejected') => {
        if (!user) return;
        setIsResponding(request.id);
        try {
            const batch = writeBatch(db);
            
            const requestRef = doc(db, "team_requests", request.id);
            batch.update(requestRef, { status: newStatus });
            
            if (newStatus === 'accepted') {
                const userRef = doc(db, "users", user.id);
                batch.update(userRef, { teamLeadId: request.requesterId });
            }

            await batch.commit();

            toast({ title: "Success", description: `Request has been ${newStatus}.` });
            fetchRequests();

        } catch (error) {
            console.error(`Error ${newStatus} request:`, error);
            toast({ variant: "destructive", title: "Error", description: `Could not ${newStatus} the request.` });
        } finally {
            setIsResponding(null);
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Team Requests</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Incoming Requests</CardTitle>
                    <CardDescription>Respond to partners who have requested you to join their team.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : incomingRequests.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No pending requests.</TableCell></TableRow>
                                ) : (
                                    incomingRequests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.requesterName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(req.requestedAt.toDate(), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleResponse(req, 'accepted')}
                                                    disabled={!!isResponding}
                                                >
                                                    {isResponding === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                                                    Accept
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive"
                                                    onClick={() => handleResponse(req, 'rejected')}
                                                    disabled={!!isResponding}
                                                >
                                                    {isResponding === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4" />}
                                                    Reject
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
        </div>
    )
}
