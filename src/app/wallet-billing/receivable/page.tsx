
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
import { Loader2, ArrowLeft, PlusCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp, addDoc } from "firebase/firestore"
import type { Receivable } from "@/types/wallet"
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

const statusColors: Record<Receivable['status'], "default" | "secondary" | "destructive"> = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
};

const receivableSchema = z.object({
    userId: z.string().min(1, "User ID is required."),
    amount: z.coerce.number().min(1, "Amount must be at least 1."),
    notes: z.string().optional(),
});

type ReceivableFormValues = z.infer<typeof receivableSchema>;

export default function ReceivableCashPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [receivables, setReceivables] = React.useState<Receivable[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm<ReceivableFormValues>({
        resolver: zodResolver(receivableSchema),
        defaultValues: {
            userId: "",
            amount: 0,
            notes: "",
        },
    });

    const fetchReceivables = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "receivables"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            const receivablesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as Receivable));
            setReceivables(receivablesList);
        } catch (error) {
            console.error("Error fetching receivables:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch receivable cash list.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchReceivables();
    }, [fetchReceivables]);

    const onSubmit = async (values: ReceivableFormValues) => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "receivables"), {
                userId: values.userId,
                // TODO: Fetch user name based on ID
                userName: "User " + values.userId,
                amount: values.amount,
                notes: values.notes,
                date: Timestamp.now(),
                status: 'Pending'
            });

            toast({ title: "Success", description: "Receivable cash entry added." });
            setIsDialogOpen(false);
            form.reset();
            fetchReceivables();

        } catch (error) {
            console.error("Error adding receivable:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add receivable entry.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                    <Link href="/wallet-billing">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Receivable Cash</h1>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Receivable Cash
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Receivable</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>User / Partner ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter the user or partner ID" {...field} />
                                            </FormControl>
                                            <FormMessage />
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
                                                <Textarea placeholder="e.g., Commission for property sale" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
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
                    <CardTitle>Receivable List</CardTitle>
                    <CardDescription>A list of all pending and paid receivables.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                ) : receivables.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No receivables found.</TableCell></TableRow>
                                ) : (
                                    receivables.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.userName}</TableCell>
                                            <TableCell>₹{item.amount.toLocaleString()}</TableCell>
                                            <TableCell>{format(item.date, 'PPP')}</TableCell>
                                            <TableCell><Badge variant={statusColors[item.status]}>{item.status}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{item.notes}</TableCell>
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
