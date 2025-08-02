
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Banknote, Landmark, CreditCard, ArrowDownCircle, ArrowUpCircle, PlusCircle, History, FileText, Gift, Send } from "lucide-react"

const receivableData = [
    { id: 'REC001', amount: 500, from: 'Client A', date: '2024-07-20', status: 'Pending' },
    { id: 'REC002', amount: 1200, from: 'Client B', date: '2024-07-18', status: 'Received' },
]

const payableData = [
    { id: 'PAY001', amount: 250, to: 'Partner X', date: '2024-07-22', status: 'Pending' },
    { id: 'PAY002', amount: 800, to: 'Service Y', date: '2024-07-15', status: 'Paid' },
]

const paymentHistoryData = [
    { id: 'HIST001', type: 'Top-up', amount: 2000, date: '2024-07-01', status: 'Success' },
    { id: 'HIST002', type: 'Withdrawal', amount: 500, date: '2024-07-05', status: 'Completed' },
    { id: 'HIST003', type: 'Payment', amount: -150, date: '2024-07-10', status: 'Success' },
    { id: 'HIST004', type: 'Reward', amount: 100, date: '2024-07-12', status: 'Credited' },
]

export default function WalletBillingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Wallet & Billing</h1>
      </div>
      <Tabs defaultValue="wallet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          <TabsTrigger value="cash">Receivable/Payable</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Wallet</CardTitle>
                    <CardDescription>Top-up your wallet to make payments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="text-4xl font-bold">$1,250.00</div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <div className="pt-4 space-y-2">
                        <Label htmlFor="topup-amount">Top-up Amount</Label>
                        <div className="flex gap-2">
                            <Input id="topup-amount" type="number" placeholder="Enter amount" />
                            <Button><CreditCard className="mr-2 h-4 w-4" /> Top Up</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="withdrawal" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Withdrawal Request</CardTitle>
                    <CardDescription>Request a withdrawal to your bank account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="withdrawal-amount">Amount</Label>
                        <Input id="withdrawal-amount" type="number" placeholder="Enter withdrawal amount" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bank-details">Bank Account Details</Label>
                        <Input id="bank-details" placeholder="Account Number, Bank Name, IFSC" />
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button><Landmark className="mr-2 h-4 w-4" /> Submit Request</Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="cash" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Receivable Cash</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivableData.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>${item.amount}</TableCell>
                                        <TableCell>{item.from}</TableCell>
                                        <TableCell><Badge variant={item.status === 'Received' ? 'secondary' : 'outline'}>{item.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Payable Cash</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payableData.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>${item.amount}</TableCell>
                                        <TableCell>{item.to}</TableCell>
                                        <TableCell><Badge variant={item.status === 'Paid' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Send Reward Points</CardTitle>
                        <CardDescription>Reward partners for their performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="partner-id">Partner ID</Label>
                            <Input id="partner-id" placeholder="Enter Partner ID" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="points">Reward Points</Label>
                            <Input id="points" type="number" placeholder="Enter points to send" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button><Send className="mr-2 h-4 w-4" /> Send Points</Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Reward Points</CardTitle>
                        <CardDescription>View current reward point balance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-4xl font-bold">1,200 <span className="text-lg text-muted-foreground">Points</span></div>
                        <p className="text-xs text-muted-foreground">Total available points</p>
                    </CardContent>
                </Card>
             </div>
        </TabsContent>

         <TabsContent value="billing" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Billing & Invoices</CardTitle>
                    <CardDescription>Manage your subscription and view invoices.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <div>
                        <p className="font-medium">Pro Plan</p>
                        <p className="text-sm text-muted-foreground">Next renewal on: 2024-08-31</p>
                    </div>
                    <Button>Renew Now</Button>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Invoices</Button>
                    <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Quotations</Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>A log of all your transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentHistoryData.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.id}</TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell className={item.amount > 0 ? 'text-green-600' : 'text-red-600'}>${item.amount.toLocaleString()}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell><Badge variant={item.status === 'Success' || item.status === 'Completed' ? 'default' : 'secondary'} className="capitalize">{item.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
