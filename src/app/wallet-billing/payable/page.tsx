
'use client'

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, PlusCircle, Search, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp, addDoc, where, doc, updateDoc } from "firebase/firestore"
import type { Payable } from "@/types/wallet"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@/types/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/hooks/use-user"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<Payable['status'], "default" | "secondary" | "destructive"> = {
  Paid: 'default',
  Pending: 'secondary',
};

const payableSchema = z.object({
    userId: z.string().min(1, "User ID is required."),
    amount: z.coerce.number().min(1, "Amount must be at least 1."),
    notes: z.string().optional(),
});

type PayableFormValues = z.infer<typeof payableSchema>;

export default function PayableListPage() {
    const { user } = useUser();
    const { toast } = useToast()
    const router = useRouter()
    const [payables, setPayables] = React.useState<Payable[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isUpdating, setIsUpdating] = React.useState(false)


    const [users, setUsers] = React.useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
    const [userSearchTerm, setUserSearchTerm] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

    const [mainSearchTerm, setMainSearchTerm] = React.useState("");
    const [activeFilter, setActiveFilter] = React.useState<Payable['status'] | 'all'>('all');


    const form = useForm<PayableFormValues>({
        resolver: zodResolver(payableSchema),
        defaultValues: {
            userId: "",
            amount: 0,
            notes: "",
        },
    });

    const fetchPayables = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const payablesRef = collection(db, "payables");
            let q;
             if (user.role === 'admin') {
                q = query(payablesRef, orderBy("date", "desc"));
            } else if (user.role === 'seller') {
                q = query(payablesRef, where("sellerId", "==", user.id), orderBy("date", "desc"));
            } else {
                q = query(payablesRef, where("userId", "==", user.id), orderBy("date", "desc"));
            }
            
            const snapshot = await getDocs(q);
            const payablesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as Payable));
            setPayables(payablesList);
        } catch (error) {
            console.error("Error fetching payables:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch payable list.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, user]);
    
    const fetchUsers = React.useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    React.useEffect(() => {
        fetchPayables();
        fetchUsers();
    }, [fetchPayables, fetchUsers]);
    
    const filteredUsers = React.useMemo(() => {
        if (!userSearchTerm) return [];
        return users.filter(user => 
            user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
    }, [users, userSearchTerm]);

    const filteredPayables = React.useMemo(() => {
        return payables.filter(item => {
            const statusMatch = activeFilter === 'all' || item.status === activeFilter;
            const searchMatch = mainSearchTerm === "" ||
                item.userName.toLowerCase().includes(mainSearchTerm.toLowerCase()) ||
                (item.notes && item.notes.toLowerCase().includes(mainSearchTerm.toLowerCase()));
            return statusMatch && searchMatch;
        });
    }, [payables, mainSearchTerm, activeFilter]);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        form.setValue("userId", user.id);
        setUserSearchTerm("");
    }

    const onSubmit = async (values: PayableFormValues) => {
        if (!selectedUser || !user) {
            toast({ variant: "destructive", title: "Error", description: "Please select a user."});
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "payables"), {
                userId: selectedUser.id,
                userName: selectedUser.name,
                sellerId: user.id, // The logged-in seller is creating this
                amount: values.amount,
                notes: values.notes,
                date: Timestamp.now(),
                status: 'Pending'
            });

            toast({ title: "Success", description: "Payable entry added." });
            setIsDialogOpen(false);
            form.reset();
            setSelectedUser(null);
            fetchPayables();

        } catch (error) {
            console.error("Error adding payable:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add payable entry.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleUpdateStatus = async (id: string, newStatus: Payable['status']) => {
        setIsUpdating(true);
        try {
            await updateDoc(doc(db, "payables", id), { status: newStatus });
            toast({ title: "Success", description: `Status updated to ${newStatus}.` });
            fetchPayables();
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
        } finally {
            setIsUpdating(false);
        }
    };


    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                    <Link href="/wallet-billing">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Payable List</h1>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Payable
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Payable</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                               <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>User / Partner</FormLabel>
                                            <FormControl>
                                               <div className="space-y-2">
                                                    {selectedUser ? (
                                                        <div className="flex items-center gap-4 p-2 border rounded-md">
                                                            <Avatar>
                                                                <AvatarImage src={selectedUser.profileImage} />
                                                                <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="font-medium">{selectedUser.name}</p>
                                                                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                                            </div>
                                                            <Button variant="ghost" onClick={() => setSelectedUser(null)}>Change</Button>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="relative">
                                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                <Input 
                                                                    placeholder="Search for a user..."
                                                                    className="pl-8"
                                                                    value={userSearchTerm}
                                                                    onChange={e => setUserSearchTerm(e.target.value)}
                                                                />
                                                            </div>
                                                            {userSearchTerm && (
                                                                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                                                                    {isLoadingUsers ? (
                                                                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                                                    ) : filteredUsers.length > 0 ? filteredUsers.map(u => (
                                                                        <div key={u.id} onClick={() => handleSelectUser(u)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                                                            {u.name} ({u.email})
                                                                        </div>
                                                                    )) : <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                               </div>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                               />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount (₹)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0.00" {...field} />
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
                                                <Textarea placeholder="e.g., Refund for order #123" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting || !selectedUser}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Add Entry
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            
             <Card>
                <CardHeader>
                     <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-auto md:flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Search by user or notes..."
                            className="pl-8 sm:w-full"
                            value={mainSearchTerm}
                            onChange={(e) => setMainSearchTerm(e.target.value)}
                          />
                        </div>
                        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as Payable['status'] | 'all')}>
                          <TabsList>
                             <TabsTrigger value="all">All</TabsTrigger>
                             <TabsTrigger value="Pending">Pending</TabsTrigger>
                             <TabsTrigger value="Paid">Paid</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                ) : filteredPayables.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No payables found.</TableCell></TableRow>
                                ) : (
                                    filteredPayables.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.userName}</TableCell>
                                            <TableCell>₹{item.amount.toLocaleString()}</TableCell>
                                            <TableCell>{format(item.date, 'PPP')}</TableCell>
                                            <TableCell><Badge variant={statusColors[item.status]}>{item.status}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{item.notes}</TableCell>
                                            <TableCell className="text-right">
                                                {item.status === 'Pending' && (
                                                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item.id, 'Paid')} disabled={isUpdating}>
                                                        <CheckCircle className="mr-2 h-4 w-4"/> Mark as Paid
                                                    </Button>
                                                )}
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
