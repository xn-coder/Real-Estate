
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
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle, Paperclip } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore"
import type { WithdrawalRequest } from "@/types/wallet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import type { User } from "@/types/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const requestFormSchema = z.object({
  amount: z.coerce.number().min(100, "Withdrawal amount must be at least ₹100."),
  sellerId: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
    // This is handled in the component logic now
    return true;
});

type RequestFormValues = z.infer<typeof requestFormSchema>

const approvalFormSchema = z.object({
    amountPaid: z.coerce.number().min(1, "Amount must be greater than 0."),
    paymentMethod: z.string().min(1, "Payment method is required."),
    proofOfPayment: z.any().optional(),
    rejectionReason: z.string().optional(),
});
type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


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

  const [sellers, setSellers] = React.useState<User[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = React.useState(true);
  const [sellerSearchTerm, setSellerSearchTerm] = React.useState("");
  const [selectedSeller, setSelectedSeller] = React.useState<User | null>(null);
  
  const [mainSearchTerm, setMainSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<WithdrawalRequest['status'] | 'all'>('all');
  
  const [selectedRequest, setSelectedRequest] = React.useState<WithdrawalRequest | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = React.useState(false);


  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';
  const canManage = isAdmin || isSeller;
  const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);


  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { amount: 100, notes: "" },
  })

  const approvalForm = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
  });

  const proofFile = approvalForm.watch("proofOfPayment");
  
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
  
  const fetchSellers = React.useCallback(async () => {
    setIsLoadingSellers(true);
    try {
        const sellersQuery = query(collection(db, "users"), where("role", "==", "seller"), where("status", "==", "active"));
        const sellersSnapshot = await getDocs(sellersQuery);
        const sellersList = sellersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setSellers(sellersList);
    } catch (error) {
        console.error("Error fetching sellers:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch sellers list.' });
    } finally {
        setIsLoadingSellers(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if(user) {
        fetchRequests();
        if (isPartner) {
            fetchSellers();
        }
    }
  }, [user, fetchRequests, isPartner, fetchSellers]);

  async function onSubmit(values: RequestFormValues) {
    if (!user) return;

    if (isPartner && !selectedSeller) {
        form.setError("sellerId", { message: "A seller must be selected." });
        return;
    }

    setIsSubmitting(true)
    try {
        await addDoc(collection(db, "withdrawal_requests"), {
            userId: user.id,
            userName: user.name,
            amount: values.amount,
            sellerId: selectedSeller?.id || null,
            notes: values.notes,
            status: "Pending",
            requestedAt: Timestamp.now(),
        });

        toast({
            title: "Request Submitted",
            description: "Your withdrawal request has been sent for approval.",
        });
        form.reset();
        setSelectedSeller(null);
        fetchRequests();
    } catch (error) {
        console.error("Error submitting request:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to submit request." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleUpdateRequest = async (values: ApprovalFormValues) => {
    if (!selectedRequest) return;
    setIsUpdating(selectedRequest.id);
    try {
        const isApproved = !values.rejectionReason;
        const newStatus = isApproved ? 'Approved' : 'Rejected';

        const proofOfPaymentUrl = values.proofOfPayment ? await fileToDataUrl(values.proofOfPayment) : null;
        
        await updateDoc(doc(db, "withdrawal_requests", selectedRequest.id), {
            status: newStatus,
            processedAt: Timestamp.now(),
            amountPaid: isApproved ? values.amountPaid : 0,
            paymentMethod: isApproved ? values.paymentMethod : null,
            proofOfPayment: proofOfPaymentUrl,
            rejectionReason: isApproved ? null : values.rejectionReason,
        });

        toast({ title: "Success", description: `Request has been ${newStatus.toLowerCase()}.` });
        fetchRequests();
        setIsApprovalDialogOpen(false);

    } catch(error) {
        console.error("Error updating request:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update request." });
    } finally {
        setIsUpdating(null);
    }
  }

  const filteredSellers = React.useMemo(() => {
    if (!sellerSearchTerm) return [];
    return sellers.filter(seller => 
        seller.name.toLowerCase().includes(sellerSearchTerm.toLowerCase()) ||
        seller.id.toLowerCase().includes(sellerSearchTerm.toLowerCase()) ||
        seller.email.toLowerCase().includes(sellerSearchTerm.toLowerCase())
    );
  }, [sellers, sellerSearchTerm]);
  
  const filteredRequests = React.useMemo(() => {
    return requests.filter(item => {
        const statusMatch = activeFilter === 'all' || item.status === activeFilter;
        const searchMatch = mainSearchTerm === "" ||
            item.userName.toLowerCase().includes(mainSearchTerm.toLowerCase());
        return statusMatch && searchMatch;
    });
  }, [requests, mainSearchTerm, activeFilter]);


  const handleSelectSeller = (seller: User) => {
    setSelectedSeller(seller);
    form.setValue("sellerId", seller.id);
    form.clearErrors("sellerId");
    setSellerSearchTerm("");
  }
  
  const openApprovalDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    approvalForm.reset({
        amountPaid: request.amount,
        paymentMethod: undefined,
        proofOfPayment: undefined,
        rejectionReason: ""
    });
    setIsApprovalDialogOpen(true);
  };


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
                
                 {isPartner && !isAdmin && (
                    <FormField
                        control={form.control}
                        name="sellerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Request from Seller</FormLabel>
                                <FormControl>
                                   <div className="space-y-2">
                                        {selectedSeller ? (
                                            <div className="flex items-center gap-4 p-2 border rounded-md">
                                                <Avatar>
                                                    <AvatarImage src={selectedSeller.profileImage} />
                                                    <AvatarFallback>{selectedSeller.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">{selectedSeller.name}</p>
                                                    <p className="text-sm text-muted-foreground">{selectedSeller.email}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => { setSelectedSeller(null); form.setValue("sellerId", ""); }}>Change</Button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Search for a seller by name or email..."
                                                        className="pl-8"
                                                        value={sellerSearchTerm}
                                                        onChange={e => setSellerSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                {sellerSearchTerm && (
                                                    <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                                                        {isLoadingSellers ? (
                                                            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                                        ) : filteredSellers.length > 0 ? filteredSellers.map(s => (
                                                            <div key={s.id} onClick={() => handleSelectSeller(s)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                                                {s.name} ({s.email})
                                                            </div>
                                                        )) : <p className="p-4 text-sm text-center text-muted-foreground">No sellers found.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                   </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
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
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                <div className="relative w-full md:w-auto md:flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by user name..."
                    className="pl-8 sm:w-full"
                    value={mainSearchTerm}
                    onChange={(e) => setMainSearchTerm(e.target.value)}
                  />
                </div>
                <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as WithdrawalRequest['status'] | 'all')}>
                  <TabsList>
                     <TabsTrigger value="all">All</TabsTrigger>
                     <TabsTrigger value="Pending">Pending</TabsTrigger>
                     <TabsTrigger value="Approved">Approved</TabsTrigger>
                     <TabsTrigger value="Rejected">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg overflow-x-auto">
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
                        ) : filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">
                                    No requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((request) => (
                                <TableRow key={request.id}>
                                    {canManage && <TableCell>{request.userName}</TableCell>}
                                    <TableCell className="font-medium">₹{request.amount.toLocaleString()}</TableCell>
                                    <TableCell>{format(request.requestedAt, 'PPP')}</TableCell>
                                    <TableCell><Badge variant={statusColors[request.status]}>{request.status}</Badge></TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            {request.status === 'Pending' ? (
                                                <Button size="sm" variant="outline" onClick={() => openApprovalDialog(request)}>
                                                    Manage
                                                </Button>
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
      
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Process Withdrawal Request</DialogTitle>
                <DialogDescription>Approve or reject the request for {selectedRequest?.userName}.</DialogDescription>
            </DialogHeader>
            <Form {...approvalForm}>
                <form onSubmit={approvalForm.handleSubmit(handleUpdateRequest)} className="space-y-4">
                    <div className="p-2 border rounded-md">
                        <p className="text-sm font-medium">Request Amount: <span className="font-bold">₹{selectedRequest?.amount.toLocaleString()}</span></p>
                    </div>
                     <FormField
                        control={approvalForm.control}
                        name="amountPaid"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount Paid</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={approvalForm.control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={approvalForm.control}
                        name="proofOfPayment"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proof of Payment</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])}/>
                                </FormControl>
                                {proofFile && <div className="text-sm pt-2 text-muted-foreground flex items-center gap-2"><Paperclip className="h-4 w-4" />{proofFile.name}</div>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="border-t pt-4 space-y-2">
                         <FormField
                            control={approvalForm.control}
                            name="rejectionReason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Rejection (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="If rejecting, provide a reason..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                         <Button type="button" variant="destructive" onClick={() => approvalForm.handleSubmit((values) => handleUpdateRequest({...values, rejectionReason: values.rejectionReason || "Request rejected by admin."}))()} disabled={!!isUpdating}>
                            <XCircle className="mr-2 h-4 w-4"/> Reject
                        </Button>
                         <Button type="submit" disabled={!!isUpdating}>
                            {isUpdating === selectedRequest?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Approve
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
