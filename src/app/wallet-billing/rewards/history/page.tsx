
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Gift, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

// Dummy data - replace with actual data fetching
const dummyHistory = [
    { id: '1', date: new Date(), type: 'Sent', toFrom: 'John Doe', points: 500, notes: 'Performance Bonus' },
    { id: '2', date: new Date(new Date().setDate(new Date().getDate() - 1)), type: 'Claimed', toFrom: 'Self', points: 200, notes: '' },
    { id: '3', date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'Sent', toFrom: 'Jane Smith', points: 1000, notes: 'Referral Reward' },
    { id: '4', date: new Date(new Date().setDate(new Date().getDate() - 10)), type: 'Claimed', toFrom: 'Self', points: 500, notes: '' },
]

export default function RewardHistoryPage() {
    const { user } = useUser();
    const [history, setHistory] = React.useState(dummyHistory);
    const [isLoading, setIsLoading] = React.useState(false);
    
    const isAdmin = user?.role === 'admin';

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
                            <TableHead>Type</TableHead>
                            {isAdmin && <TableHead>User</TableHead>}
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                        ) : history.length === 0 ? (
                            <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">No history found.</TableCell></TableRow>
                        ) : history.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{format(item.date, 'PPP')}</TableCell>
                                <TableCell>
                                    <Badge variant={item.type === 'Sent' ? 'destructive' : 'default'} className="capitalize">
                                        {item.type === 'Sent' ? <ArrowUp className="mr-1 h-3 w-3"/> : <ArrowDown className="mr-1 h-3 w-3"/>}
                                        {item.type}
                                    </Badge>
                                </TableCell>
                                {isAdmin && <TableCell>{item.toFrom}</TableCell>}
                                <TableCell className="text-right font-medium">{item.points.toLocaleString()}</TableCell>
                                <TableCell className="text-muted-foreground">{item.notes}</TableCell>
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
