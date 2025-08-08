
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { WithdrawalRequest } from "@/types/wallet"
import type { User } from "@/types/user"

const statusColors: Record<WithdrawalRequest['status'], "default" | "secondary" | "destructive"> = {
    Pending: 'secondary',
    Approved: 'default',
    Rejected: 'destructive',
};

export default function PaymentHistoryPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [history, setHistory] = React.useState<WithdrawalRequest[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const isAdmin = user?.role === 'admin';
    const isSeller = user?.role === 'seller';
    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);

    const fetchHistory = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            const requestsRef = collection(db, "withdrawal_requests");
            let q;
            if (isAdmin) {
                q = query(requestsRef, orderBy("requestedAt", "desc"));
            } else if (isSeller) {
                q = query(requestsRef, where("sellerId", "==", user.id), orderBy("requestedAt", "desc"));
            } else { // Partner or other roles
                q = query(requestsRef, where("userId", "==", user.id), orderBy("requestedAt", "desc"));
            }
            
            const snapshot = await getDocs(q);

            const historyListPromises = snapshot.docs.map(async (docData) => {
                const requestData = {
                    id: docData.id,
                    ...docData.data(),
                    requestedAt: (docData.data().requestedAt as Timestamp).toDate(),
                    processedAt: docData.data().processedAt ? (docData.data().processedAt as Timestamp).toDate() : undefined,
                } as WithdrawalRequest

                if (requestData.sellerId) {
                    const sellerDoc = await getDoc(doc(db, "users", requestData.sellerId));
                    if (sellerDoc.exists()) {
                        requestData.sellerName = sellerDoc.data().name;
                    }
                }
                return requestData;
            });
            
            const historyList = await Promise.all(historyListPromises);
            setHistory(historyList);

        } catch (error) {
            console.error("Error fetching payment history:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch payment history.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, isAdmin, isSeller, toast]);

    React.useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, fetchHistory]);

    if (isUserLoading) {
        return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/wallet-billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Payment History</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>A log of all your withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {isAdmin && <TableHead>User</TableHead>}
                            {(isPartner || isSeller) && <TableHead>Requested From (Seller)</TableHead>}
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requested On</TableHead>
                            <TableHead>Processed On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={isAdmin || isPartner || isSeller ? 5 : 4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : history.length === 0 ? (
                            <TableRow><TableCell colSpan={isAdmin || isPartner || isSeller ? 5 : 4} className="h-24 text-center">No payment history found.</TableCell></TableRow>
                        ) : (
                            history.map(item => (
                                <TableRow key={item.id}>
                                    {isAdmin && <TableCell>{item.userName}</TableCell>}
                                    {(isPartner || isSeller) && <TableCell>{item.sellerName || 'N/A'}</TableCell>}
                                    <TableCell className="font-medium">₹{item.amount.toLocaleString()}</TableCell>
                                    <TableCell><Badge variant={statusColors[item.status]}>{item.status}</Badge></TableCell>
                                    <TableCell>{format(item.requestedAt, 'PPP')}</TableCell>
                                    <TableCell>{item.processedAt ? format(item.processedAt, 'PPP') : 'N/A'}</TableCell>
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
