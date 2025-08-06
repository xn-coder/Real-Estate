
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

type RewardTransaction = {
    id: string;
    date: Date;
    type: 'Sent' | 'Claimed';
    from: string; // Name of sender
    to: string; // Name of receiver
    points: number;
    notes: string;
}

export default function RewardHistoryPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [history, setHistory] = React.useState<RewardTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const isAdmin = user?.role === 'admin';

    const fetchHistory = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // This is a placeholder. In a real app, you would have a dedicated 'reward_transactions' collection.
            // For now, we continue with dummy data as the backend logic is not yet in place.
            const dummyHistory = [
                { id: '1', date: new Date(), type: 'Sent', to: user.name, from: 'Admin', points: 500, notes: 'Performance Bonus' },
                { id: '2', date: new Date(new Date().setDate(new Date().getDate() - 1)), type: 'Claimed', to: 'Wallet', from: user.name, points: 200, notes: 'Redeemed for cash' },
                { id: '3', date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'Sent', to: user.name, from: 'Admin', points: 1000, notes: 'Referral Reward' },
                { id: '4', date: new Date(new Date().setDate(new Date().getDate() - 10)), type: 'Claimed', to: 'Wallet', from: user.name, points: 500, notes: 'Redeemed for cash' },
            ];
            setHistory(isAdmin ? [] : dummyHistory); // Show dummy data only for partners for now
        } catch (error) {
            console.error("Error fetching reward history:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch reward history.' });
        } finally {
            setIsLoading(false);
        }

    }, [user, isAdmin, toast]);

    React.useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/wallet-billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Reward Points History</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>A log of all your reward point transactions.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : history.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">No reward history found.</TableCell></TableRow>
                        ) : history.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{format(item.date, 'PPP')}</TableCell>
                                <TableCell>
                                    <div className="font-medium">
                                        {item.type === 'Sent' ? `Points Received from ${item.from}` : `Points Claimed`}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{item.notes}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-medium flex items-center justify-end ${item.type === 'Sent' ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.type === 'Sent' ? 
                                            <ArrowDown className="mr-1 h-4 w-4"/> : 
                                            <ArrowUp className="mr-1 h-4 w-4"/>
                                        }
                                        {item.type === 'Sent' ? '+' : '-'} {item.points.toLocaleString()}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  )
}
