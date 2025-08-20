
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
import { Loader2, ArrowLeft, PlusCircle, Search, CheckCircle, Gift, Banknote, Percent, Square } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp, addDoc, where, doc, updateDoc, setDoc } from "firebase/firestore"
import type { EarningRule } from "@/types/wallet"
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
import type { Property } from "@/types/property"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/hooks/use-user"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const earningRuleSchema = z.object({
    propertyId: z.string().min(1, "A property must be selected."),
    type: z.enum(["reward_points", "commission_percentage", "flat_amount", "per_sq_ft"]),
    value: z.coerce.number().min(0, "Value must be a positive number."),
    totalSqFt: z.coerce.number().optional(),
}).refine(data => {
    if (data.type === 'per_sq_ft') {
        return data.totalSqFt && data.totalSqFt > 0;
    }
    return true;
}, {
    message: "Total Sq. Ft. is required for this earning type.",
    path: ["totalSqFt"],
});

type EarningRuleFormValues = z.infer<typeof earningRuleSchema>;

export default function PartnerEarningPage() {
    const { user } = useUser();
    const { toast } = useToast()
    const [earningRules, setEarningRules] = React.useState<EarningRule[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const [properties, setProperties] = React.useState<Property[]>([]);
    const [isLoadingProperties, setIsLoadingProperties] = React.useState(true);
    const [propertySearchTerm, setPropertySearchTerm] = React.useState("");
    const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

    const form = useForm<EarningRuleFormValues>({
        resolver: zodResolver(earningRuleSchema),
    });

    const fetchEarningRules = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const rulesRef = collection(db, "earning_rules");
            const snapshot = await getDocs(query(rulesRef, orderBy("createdAt", "desc")));
            
            const propertiesSnapshot = await getDocs(collection(db, "properties"));
            const propsMap = new Map(propertiesSnapshot.docs.map(doc => [doc.id, doc.data().catalogTitle]));

            const rulesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                propertyTitle: propsMap.get(doc.data().propertyId) || 'Unknown Property',
                createdAt: (doc.data().createdAt as Timestamp).toDate(),
            } as EarningRule));
            setEarningRules(rulesList);

        } catch (error) {
            console.error("Error fetching earning rules:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch earning rules.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    const fetchProperties = React.useCallback(async () => {
        setIsLoadingProperties(true);
        try {
            const propsSnapshot = await getDocs(query(collection(db, "properties"), where("status", "==", "For Sale")));
            setProperties(propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
        } catch (error) {
            console.error("Error fetching properties:", error);
        } finally {
            setIsLoadingProperties(false);
        }
    }, []);

    React.useEffect(() => {
        fetchEarningRules();
        fetchProperties();
    }, [fetchEarningRules, fetchProperties]);

    const filteredProperties = React.useMemo(() => {
        if (!propertySearchTerm) return [];
        return properties.filter(p =>
            p.catalogTitle.toLowerCase().includes(propertySearchTerm.toLowerCase())
        );
    }, [properties, propertySearchTerm]);

    const handleSelectProperty = (property: Property) => {
        setSelectedProperty(property);
        form.setValue("propertyId", property.id);
        setPropertySearchTerm("");
    }

    const onSubmit = async (values: EarningRuleFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await setDoc(doc(db, "earning_rules", values.propertyId), {
                ...values,
                createdAt: Timestamp.now(),
                setterId: user.id,
            });

            toast({ title: "Success", description: "Earning rule has been set for the property." });
            setIsDialogOpen(false);
            form.reset();
            setSelectedProperty(null);
            fetchEarningRules();
        } catch (error) {
            console.error("Error setting earning rule:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not set the earning rule.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const earningType = form.watch("type");
    
    const formatValue = (rule: EarningRule) => {
        switch(rule.type) {
            case 'reward_points': return `${rule.value.toLocaleString()} points`;
            case 'commission_percentage': return `${rule.value}%`;
            case 'flat_amount': return `₹${rule.value.toLocaleString()}`;
            case 'per_sq_ft': return `₹${rule.value}/sq.ft for ${rule.totalSqFt} sq.ft. (Total: ₹${(rule.value * (rule.totalSqFt || 0)).toLocaleString()})`;
            default: return 'N/A';
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
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Partner Earning</h1>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Set Default Pricing
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Set Partner Earning Rule</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                               <FormField
                                    control={form.control}
                                    name="propertyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Property</FormLabel>
                                            <FormControl>
                                                {selectedProperty ? (
                                                    <div className="flex items-center gap-4 p-2 border rounded-md">
                                                        <p className="font-medium flex-1">{selectedProperty.catalogTitle}</p>
                                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedProperty(null); form.setValue("propertyId", ""); }}>Change</Button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Input placeholder="Search for a property..." value={propertySearchTerm} onChange={e => setPropertySearchTerm(e.target.value)} />
                                                        {propertySearchTerm && (
                                                            <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                                                                {isLoadingProperties ? <p className="p-2 text-sm text-muted-foreground">Loading...</p> : 
                                                                    filteredProperties.map(p => (
                                                                        <div key={p.id} onClick={() => handleSelectProperty(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                                                            {p.catalogTitle}
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                               />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Earning Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an earning type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="reward_points">Reward Points</SelectItem>
                                                    <SelectItem value="commission_percentage">Commission (%)</SelectItem>
                                                    <SelectItem value="flat_amount">Flat Amount (₹)</SelectItem>
                                                    <SelectItem value="per_sq_ft">Per Sq. Ft. (₹)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {earningType && (
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField
                                            control={form.control}
                                            name="value"
                                            render={({ field }) => (
                                                <FormItem className={earningType === 'per_sq_ft' ? 'col-span-1' : 'col-span-2'}>
                                                    <FormLabel>Value</FormLabel>
                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         {earningType === 'per_sq_ft' && (
                                            <FormField
                                                control={form.control}
                                                name="totalSqFt"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Total Sq. Ft.</FormLabel>
                                                        <FormControl><Input type="number" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting || !selectedProperty}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Set Rule
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Earning Rules per Property</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Earning Rule</TableHead>
                                    <TableHead>Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                ) : earningRules.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No earning rules set.</TableCell></TableRow>
                                ) : (
                                    earningRules.map(rule => (
                                        <TableRow key={rule.id}>
                                            <TableCell className="font-medium">{rule.propertyTitle}</TableCell>
                                            <TableCell className="capitalize">{rule.type.replace(/_/g, ' ')}</TableCell>
                                            <TableCell>{formatValue(rule)}</TableCell>
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
