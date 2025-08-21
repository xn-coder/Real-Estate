
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { RewardTransaction } from "@/types/wallet"
import { Input } from "@/components/ui/input"

export default function ClaimedRewardsHistoryPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [claims, setClaims] = React.useState<RewardTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    
    const isAdmin = user?.role === 'admin';

    const fetchClaims = React.useCallback(async () => {
        if (!user || !isAdmin) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);

        try {
            const transactionsRef = collection(db, "reward_transactions");
            const q = query(transactionsRef, where("type", "==", "Claimed"), orderBy("date", "desc"));
            
            const snapshot = await getDocs(q);
            const claimsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as RewardTransaction));
            setClaims(claimsList);

        } catch (error) {
            console.error("Error fetching claimed rewards history:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch claimed rewards history.' });
        } finally {
            setIsLoading(false);
        }

    }, [user, isAdmin, toast]);

    React.useEffect(() => {
        if(user) {
            fetchClaims();
        }
    }, [user, fetchClaims]);
    
    const filteredClaims = React.useMemo(() => {
        return claims.filter(item => 
            item.fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.notes.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [claims, searchTerm]);

  if (isUserLoading) {
    return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAdmin) {
    return <div className="flex-1 p-4 md:p-8 pt-6"><p>You do not have permission to view this page.</p></div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Claimed Rewards History</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>All Claimed Rewards</CardTitle>
              <CardDescription>A log of all reward offers claimed by users.</CardDescription>
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by user or offer..."
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
                            <TableHead>User Name</TableHead>
                            <TableHead>Offer Claimed</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Points Spent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : filteredClaims.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No claimed rewards found.</TableCell></TableRow>
                        ) : filteredClaims.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.fromName}</TableCell>
                                <TableCell>{item.notes.replace('Claimed offer: ', '')}</TableCell>
                                <TableCell>{format(item.date, 'PPP')}</TableCell>
                                <TableCell className="text-right font-medium">
                                   {item.points.toLocaleString()}
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
