
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
import { Loader2, ArrowLeft, PlusCircle, Search, CheckCircle, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, updateDoc, setDoc, getDoc, where, Timestamp } from "firebase/firestore"
import type { Property, EarningRuleValue } from "@/types/property"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import { format } from "date-fns"


type PayableEntry = {
    id: string; // lead id
    dealDate: Date;
    property: Property;
    partner: User;
    dealValue: number;
    earningRule: EarningRuleValue;
    earningAmount: number;
    status: 'Payable' | 'Paid';
};

const earningRuleValueSchema = z.object({
  type: z.enum(["reward_points", "commission_percentage", "flat_amount", "per_sq_ft"]),
  value: z.coerce.number().min(0, "Value must be a positive number."),
  totalSqFt: z.coerce.number().optional(),
}).refine(data => {
    if (data.type === 'per_sq_ft' && (!data.totalSqFt || data.totalSqFt <= 0)) {
        return false;
    }
    return true;
}, {
    message: "Total Sq. Ft. is required for this earning type.",
    path: ["totalSqFt"],
});

const earningRulesSchema = z.object({
    earningRules: z.object({
      affiliate: earningRuleValueSchema.optional(),
      super_affiliate: earningRuleValueSchema.optional(),
      associate: earningRuleValueSchema.optional(),
      channel: earningRuleValueSchema.optional(),
      franchisee: earningRuleValueSchema.optional(),
    }),
});

type EarningRuleFormValues = z.infer<typeof earningRulesSchema>;

const partnerRoles = {
    affiliate: 'Affiliate Partner',
    super_affiliate: 'Super Affiliate Partner',
    associate: 'Associate Partner',
    channel: 'Channel Partner',
    franchisee: 'Franchisee',
} as const;


export default function PartnerEarningPage() {
    const { toast } = useToast()
    const [payables, setPayables] = React.useState<PayableEntry[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isRuleDialogOpen, setIsRuleDialogOpen] = React.useState(false)
    const [selectedPropertyForRules, setSelectedPropertyForRules] = React.useState<Property | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<EarningRuleFormValues>({
        resolver: zodResolver(earningRulesSchema),
    });

    const calculateEarning = (dealValue: number, rule: EarningRuleValue) => {
        switch (rule.type) {
            case "commission_percentage":
                return (dealValue * rule.value) / 100;
            case "flat_amount":
                return rule.value;
            case "per_sq_ft":
                return rule.value * (rule.totalSqFt || 0);
            case "reward_points":
            default:
                return 0; // Not a monetary earning
        }
    }

    const formatRule = (rule: EarningRuleValue) => {
        switch (rule.type) {
            case "commission_percentage":
                return `${rule.value}% Commission`;
            case "flat_amount":
                return `₹${rule.value.toLocaleString()} Flat`;
            case "per_sq_ft":
                return `₹${rule.value}/sq.ft`;
            case "reward_points":
                return `${rule.value.toLocaleString()} Points`;
            default:
                return "N/A";
        }
    };


    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const leadsQuery = query(collection(db, "leads"), where("status", "in", ["Deal closed", "Completed"]));
            const leadsSnapshot = await getDocs(leadsQuery);

            const globalDefaultsDocRef = doc(db, 'app_settings', 'default_earning_rules');
            const defaultsDocSnap = await getDoc(globalDefaultsDocRef);
            const defaultRules = defaultsDocSnap.exists() ? defaultsDocSnap.data().earningRules || {} : {};

            const payablesListPromises = leadsSnapshot.docs.map(async (leadDoc) => {
                const lead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
                
                if (!lead.partnerId || !lead.propertyId) return null;

                const [partnerDoc, propertyDoc] = await Promise.all([
                    getDoc(doc(db, "users", lead.partnerId)),
                    getDoc(doc(db, "properties", lead.propertyId))
                ]);

                if (!partnerDoc.exists() || !propertyDoc.exists()) return null;

                const partner = { id: partnerDoc.id, ...partnerDoc.data() } as User;
                const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

                const partnerRole = partner.role as keyof typeof defaultRules;
                const applicableRule = property.earningRules?.[partnerRole] || defaultRules[partnerRole];

                if (!applicableRule || applicableRule.type === 'reward_points') return null;

                const dealValue = lead.closingAmount || property.listingPrice;
                const earningAmount = calculateEarning(dealValue, applicableRule);

                return {
                    id: lead.id,
                    dealDate: (lead.createdAt as Timestamp).toDate(),
                    property,
                    partner,
                    dealValue,
                    earningRule: applicableRule,
                    earningAmount,
                    status: 'Payable', // This would be dynamic in a real scenario
                };
            });

            const resolvedPayables = (await Promise.all(payablesListPromises)).filter(Boolean) as PayableEntry[];
            setPayables(resolvedPayables);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch partner earnings.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleEditRuleClick = (property: Property) => {
        setSelectedPropertyForRules(property);
        form.reset({ earningRules: property.earningRules || {} });
        setIsRuleDialogOpen(true);
    };
    
    const onRuleSubmit = async (values: EarningRuleFormValues) => {
        if (!selectedPropertyForRules) return;
        setIsSubmitting(true);
        try {
            const propertyRef = doc(db, "properties", selectedPropertyForRules.id);
            await updateDoc(propertyRef, {
                earningRules: values.earningRules,
            });
            toast({ title: "Success", description: "Earning rules for the property have been updated." });
            setIsRuleDialogOpen(false);
            fetchData();
        } catch (error) {
             console.error("Error updating earning rules:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update earning rules.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const EarningRuleFormFields = ({ role }: { role: keyof typeof partnerRoles }) => {
        const type = form.watch(`earningRules.${role}.type`);
        return (
            <div className="space-y-4 p-4 border rounded-md">
                <h4 className="font-semibold text-center">{partnerRoles[role]}</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name={`earningRules.${role}.type`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
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
                     <FormField
                        control={form.control}
                        name={`earningRules.${role}.value`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 {type === 'per_sq_ft' && (
                    <FormField
                        control={form.control}
                        name={`earningRules.${role}.totalSqFt`}
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
        );
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
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Partner Earnings Payable</h1>
                </div>
                 <Button asChild variant="outline">
                    <Link href="/wallet-billing/payable/rules">
                         Set Default Earning Rules
                    </Link>
                </Button>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Payable Commissions</CardTitle>
                    <CardDescription>A list of all completed deals and the calculated partner earnings.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Deal Value</TableHead>
                                    <TableHead>Earning Rule</TableHead>
                                    <TableHead>Earning Amount</TableHead>
                                    <TableHead>Deal Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                     <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                ) : payables.length === 0 ? (
                                     <TableRow><TableCell colSpan={8} className="h-24 text-center">No payable earnings found.</TableCell></TableRow>
                                ) : (
                                    payables.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.property.catalogTitle}</TableCell>
                                            <TableCell>{item.partner.name}</TableCell>
                                            <TableCell>₹{item.dealValue.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{formatRule(item.earningRule)}</Badge>
                                            </TableCell>
                                             <TableCell className="font-semibold">₹{item.earningAmount.toLocaleString()}</TableCell>
                                             <TableCell>{format(item.dealDate, "PPP")}</TableCell>
                                            <TableCell>
                                                <Badge>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                 <Button variant="outline" size="sm" onClick={() => handleEditRuleClick(item.property)}>
                                                    <Pencil className="mr-2 h-4 w-4"/>
                                                    Edit Rule
                                                </Button>
                                                <Button variant="outline" size="sm" disabled={item.status === 'Paid'}>
                                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                                    Mark as Paid
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                   </div>
                </CardContent>
            </Card>
            
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                     <DialogHeader>
                        <DialogTitle>Edit Earning Rules for {selectedPropertyForRules?.catalogTitle}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onRuleSubmit)} className="space-y-4">
                            <div className="max-h-[65vh] overflow-y-auto space-y-4 p-2">
                            {(Object.keys(partnerRoles) as Array<keyof typeof partnerRoles>).map(role => (
                                <EarningRuleFormFields key={role} role={role} />
                            ))}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Rules
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
