
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore"
import type { WithdrawalRequest } from "@/types/wallet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

const requestFormSchema = z.object({
  amount: z.coerce.number().min(100, "Withdrawal amount must be at least ₹100."),
  sellerId: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
    // This refine is a placeholder as we will check the role in the component.
    // A more complex schema could be used but this is simpler.
    return true;
});

type RequestFormValues = z.infer<typeof requestFormSchema>

const statusColors: Record<WithdrawalRequest['status'], "default" | "secondary" | "destructive"> = {
    Pending: 'secondary',
    Approved: 'default',
    Rejected: 'destructive',
};

export default function WithdrawalRequestPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [requests, setRequests] = React.useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';
  const canManage = isAdmin || isSeller;
  const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);


  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { amount: 100, notes: "" },
  })
  
  const fetchRequests = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        let q;
        const requestsCollection = collection(db, "withdrawal_requests");
        if (isAdmin) {
             q = query(requestsCollection, orderBy("requestedAt", "desc"));
        } else if(isSeller) {
             q = query(requestsCollection, where("sellerId", "==", user.id), orderBy("requestedAt", "desc"));
        } else { // Partner or other roles
            q = query(requestsCollection, where("userId", "==", user.id), orderBy("requestedAt", "desc"));
        }
        
        const snapshot = await getDocs(q);
        const requestList = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            requestedAt: (d.data().requestedAt as Timestamp).toDate(),
        } as WithdrawalRequest));
        setRequests(requestList);

    } catch(error) {
        console.error("Error fetching requests:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch withdrawal requests." });
    } finally {
        setIsLoading(false);
    }
  }, [user, isAdmin, isSeller, toast]);

  React.useEffect(() => {
    if(user) fetchRequests();
  }, [user, fetchRequests]);

  async function onSubmit(values: RequestFormValues) {
    if (!user) return;

    if (isPartner && !values.sellerId) {
        form.setError("sellerId", { message: "Seller ID is required." });
        return;
    }

    setIsSubmitting(true)
    try {
        await addDoc(collection(db, "withdrawal_requests"), {
            userId: user.id,
            userName: user.name,
            amount: values.amount,
            sellerId: values.sellerId || null,
            notes: values.notes,
            status: "Pending",
            requestedAt: Timestamp.now(),
        });

        toast({
            title: "Request Submitted",
            description: "Your withdrawal request has been sent for approval.",
        });
        form.reset();
        fetchRequests();
    } catch (error) {
        console.error("Error submitting request:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to submit request." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleUpdateRequest = async (requestId: string, newStatus: 'Approved' | 'Rejected') => {
    setIsUpdating(requestId);
    try {
        await updateDoc(doc(db, "withdrawal_requests", requestId), {
            status: newStatus,
            processedAt: Timestamp.now(),
        });
        toast({ title: "Success", description: `Request has been ${newStatus.toLowerCase()}.` });
        fetchRequests();
    } catch(error) {
        console.error("Error updating request:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update request." });
    } finally {
        setIsUpdating(null);
    }
  }

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
        <h1 className="text-2xl font-bold tracking-tight font-headline">Withdrawal Request</h1>
      </div>
      
      {!canManage && (
        <Card className="max-w-2xl">
            <CardHeader>
            <CardTitle>Request a Withdrawal</CardTitle>
            <CardDescription>Enter the amount you wish to withdraw from your wallet.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Enter amount" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 {isPartner && (
                    <FormField
                        control={form.control}
                        name="sellerId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Seller ID</FormLabel>
                            <FormControl>
                            <Input placeholder="Enter the Seller ID to request funds from" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
                 <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., For business expenses" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
            <CardTitle>{canManage ? "Manage Requests" : "My Request History"}</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {canManage && <TableHead>User</TableHead>}
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            {canManage && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">
                                    No requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => (
                                <TableRow key={request.id}>
                                    {canManage && <TableCell>{request.userName}</TableCell>}
                                    <TableCell className="font-medium">₹{request.amount.toLocaleString()}</TableCell>
                                    <TableCell>{format(request.requestedAt, 'PPP')}</TableCell>
                                    <TableCell><Badge variant={statusColors[request.status]}>{request.status}</Badge></TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            {request.status === 'Pending' ? (
                                                <div className="space-x-2">
                                                    <Button size="sm" variant="outline" disabled={!!isUpdating} onClick={() => handleUpdateRequest(request.id, 'Approved')}>
                                                        {isUpdating === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Approve"}
                                                    </Button>
                                                     <Button size="sm" variant="destructive" disabled={!!isUpdating} onClick={() => handleUpdateRequest(request.id, 'Rejected')}>
                                                        {isUpdating === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Reject"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Processed</span>
                                            )}
                                        </TableCell>
                                    )}
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
