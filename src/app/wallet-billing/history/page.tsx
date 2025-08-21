
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, Search, ArrowUp, ArrowDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { WithdrawalRequest } from "@/types/wallet"
import { Input } from "@/components/ui/input"

type Transaction = {
    id: string;
    date: Date;
    description: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
    type: 'Withdrawal' | 'Top-up' | 'Sent' | 'Received';
    from: string;
    to: string;
};

const statusColors: Record<Transaction['status'], "default" | "secondary" | "destructive"> = {
    Pending: 'secondary',
    Approved: 'default',
    Completed: 'default',
    Rejected: 'destructive',
};

export default function PaymentHistoryPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [history, setHistory] = React.useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    
    const isAdmin = user?.role === 'admin';

    const fetchHistory = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            const allTransactions: Transaction[] = [];

            // 1. Fetch Withdrawal Requests
            const withdrawalRef = collection(db, "withdrawal_requests");
            let withdrawalQuery;
            if (isAdmin) {
                withdrawalQuery = query(withdrawalRef, orderBy("requestedAt", "desc"));
            } else {
                 withdrawalQuery = query(withdrawalRef, where("userId", "==", user.id), orderBy("requestedAt", "desc"));
            }
            const withdrawalSnapshot = await getDocs(withdrawalQuery);
            withdrawalSnapshot.forEach(doc => {
                const data = doc.data() as WithdrawalRequest;
                allTransactions.push({
                    id: doc.id,
                    date: (data.requestedAt as Timestamp).toDate(),
                    description: `Withdrawal Request`,
                    amount: data.amount,
                    status: data.status,
                    type: 'Withdrawal',
                    from: data.userName,
                    to: 'Bank'
                });
            });

            // 2. Fetch Wallet Transactions
            const walletTxRef = collection(db, "wallet_transactions");
            let walletTxQuery;
             if (isAdmin) {
                walletTxQuery = query(walletTxRef, orderBy("createdAt", "desc"));
            } else {
                walletTxQuery = query(walletTxRef, where("userId", "==", user.id), orderBy("createdAt", "desc"));
            }
            const walletTxSnapshot = await getDocs(walletTxQuery);
            const userNames: Record<string, string> = {};

            const fetchUserName = async (userId: string) => {
                if(userNames[userId]) return userNames[userId];
                const userDoc = await getDoc(doc(db, "users", userId));
                const name = userDoc.exists() ? userDoc.data().name : 'Unknown User';
                userNames[userId] = name;
                return name;
            }

            for (const txDoc of walletTxSnapshot.docs) {
                const data = txDoc.data();
                const fromName = await fetchUserName(data.fromId);
                const toName = await fetchUserName(data.toId);
                
                 allTransactions.push({
                    id: txDoc.id,
                    date: (data.createdAt as Timestamp).toDate(),
                    description: data.type === 'topup' ? 'Wallet Top-up' : `Funds sent to ${toName}`,
                    amount: data.amount,
                    status: 'Completed',
                    type: data.type === 'topup' ? 'Top-up' : 'Sent',
                    from: fromName,
                    to: toName
                });
            }
            
            // Sort all transactions by date
            allTransactions.sort((a,b) => b.date.getTime() - a.date.getTime());
            
            setHistory(allTransactions);

        } catch (error) {
            console.error("Error fetching payment history:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch payment history.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdmin, toast]);

    React.useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, fetchHistory]);

    const filteredHistory = React.useMemo(() => {
        return history.filter(item => 
            isAdmin ? 
            (item.from.toLowerCase().includes(searchTerm.toLowerCase()) || item.to.toLowerCase().includes(searchTerm.toLowerCase())) : true
        );
    }, [history, searchTerm, isAdmin]);

    if (isUserLoading) {
        return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Payment History</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Transactions</CardTitle>
              {isAdmin && (
                <div className="flex items-center justify-between gap-4 pt-4">
                    <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by user name..."
                        className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                </div>
              )}
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            {isAdmin && <TableHead>From</TableHead>}
                            {isAdmin && <TableHead>To</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={isAdmin ? 6 : 4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : filteredHistory.length === 0 ? (
                            <TableRow><TableCell colSpan={isAdmin ? 6 : 4} className="h-24 text-center">No payment history found.</TableCell></TableRow>
                        ) : (
                            filteredHistory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(item.date, 'PPP')}</TableCell>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    {isAdmin && <TableCell>{item.from}</TableCell>}
                                    {isAdmin && <TableCell>{item.to}</TableCell>}
                                    <TableCell><Badge variant={statusColors[item.status]}>{item.status}</Badge></TableCell>
                                    <TableCell className="text-right font-medium flex items-center justify-end">
                                       {item.type === 'Withdrawal' || item.type === 'Sent' ? 
                                            <ArrowUp className="mr-1 h-4 w-4 text-red-500"/> :
                                            <ArrowDown className="mr-1 h-4 w-4 text-green-500"/>
                                       }
                                       ₹{item.amount.toLocaleString()}
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
