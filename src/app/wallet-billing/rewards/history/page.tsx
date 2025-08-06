
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
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { RewardTransaction } from "@/types/wallet"


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
            const transactionsRef = collection(db, "reward_transactions");
            let q;

            if (isAdmin) {
                // Admin sees all transactions
                q = query(transactionsRef, orderBy("date", "desc"));
            } else {
                // Partner sees transactions where they are the sender or receiver
                const receivedQuery = query(transactionsRef, where("toId", "==", user.id));
                const sentQuery = query(transactionsRef, where("fromId", "==", user.id));

                const [receivedSnapshot, sentSnapshot] = await Promise.all([
                    getDocs(receivedQuery),
                    getDocs(sentQuery)
                ]);

                const combined = [...receivedSnapshot.docs, ...sentSnapshot.docs];
                const uniqueDocs = Array.from(new Set(combined.map(doc => doc.id))).map(id => {
                    return combined.find(doc => doc.id === id)!;
                });
                
                const historyList = uniqueDocs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: (doc.data().date as Timestamp).toDate(),
                } as RewardTransaction));

                setHistory(historyList.sort((a,b) => b.date.getTime() - a.date.getTime()));
                setIsLoading(false);
                return; // Exit here for non-admins
            }
            
            // This part runs only for admin
            const snapshot = await getDocs(q);
            const historyList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as RewardTransaction));
            setHistory(historyList);

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
              <CardDescription>A log of all reward point transactions.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            {isAdmin && <TableHead>From</TableHead>}
                            {isAdmin && <TableHead>To</TableHead>}
                            <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={isAdmin ? 5 : 3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : history.length === 0 ? (
                            <TableRow><TableCell colSpan={isAdmin ? 5 : 3} className="h-24 text-center">No reward history found.</TableCell></TableRow>
                        ) : history.map(item => {
                            const isCredit = !isAdmin && item.toId === user?.id;
                            const isDebit = !isAdmin && item.fromId === user?.id;
                            
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{format(item.date, 'PPP')}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {item.notes || (item.type === 'Sent' ? 'Points Sent' : 'Points Claimed')}
                                        </div>
                                    </TableCell>
                                    {isAdmin && <TableCell>{item.fromName}</TableCell>}
                                    {isAdmin && <TableCell>{item.toName}</TableCell>}
                                    <TableCell className="text-right">
                                        <span className={`font-medium flex items-center justify-end ${isCredit ? 'text-green-600' : isDebit ? 'text-red-600' : ''}`}>
                                            {isCredit && <ArrowDown className="mr-1 h-4 w-4"/>}
                                            {isDebit && <ArrowUp className="mr-1 h-4 w-4"/>}
                                            {isCredit ? '+' : isDebit ? '-' : ''} {item.points.toLocaleString()}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  )
}
