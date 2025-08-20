
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { RewardTransaction } from "@/types/wallet"
import { Input } from "@/components/ui/input"


export default function RewardHistoryPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [history, setHistory] = React.useState<RewardTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    
    const isAdmin = user?.role === 'admin';
    const isSeller = user?.role === 'seller';

    const fetchHistory = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            const transactionsRef = collection(db, "reward_transactions");
            let q;

            if (isAdmin || isSeller) {
                // Admin and sellers see all transactions they initiated
                q = query(transactionsRef, where("fromId", "==", user.id), orderBy("date", "desc"));
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
                return; // Exit here for non-admins/sellers
            }
            
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

    }, [user, isAdmin, isSeller, toast]);

    React.useEffect(() => {
        if(user) {
            fetchHistory();
        }
    }, [user, fetchHistory]);
    
    const filteredHistory = React.useMemo(() => {
        return history.filter(item => 
            item.toName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [history, searchTerm]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Reward Points History</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by recipient name..."
                    className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            {(isAdmin || isSeller) && <TableHead>To</TableHead>}
                            <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={(isAdmin || isSeller) ? 4 : 3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : filteredHistory.length === 0 ? (
                            <TableRow><TableCell colSpan={(isAdmin || isSeller) ? 4 : 3} className="h-24 text-center">No reward history found.</TableCell></TableRow>
                        ) : filteredHistory.map(item => {
                            const isCredit = !isAdmin && !isSeller && item.toId === user?.id;
                            const isDebit = !isAdmin && !isSeller && item.fromId === user?.id;
                            
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{format(item.date, 'PPP')}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {item.notes || (item.type === 'Sent' ? 'Points Sent' : 'Points Claimed')}
                                        </div>
                                    </TableCell>
                                    {(isAdmin || isSeller) && <TableCell>{item.toName}</TableCell>}
                                    <TableCell className="text-right">
                                        <span className={`font-medium flex items-center justify-end ${isCredit ? 'text-green-600' : (isDebit || isAdmin || isSeller) ? 'text-red-600' : ''}`}>
                                            {isCredit && <ArrowDown className="mr-1 h-4 w-4"/>}
                                            {(isDebit || isAdmin || isSeller) && <ArrowUp className="mr-1 h-4 w-4"/>}
                                            {isCredit ? '+' : '-'} {item.points.toLocaleString()}
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
