'use client'

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
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

const earningRuleSchema = z.object({
    propertyId: z.string().optional(),
    earningRules: z.object({
      affiliate: earningRuleValueSchema.optional(),
      super_affiliate: earningRuleValueSchema.optional(),
      associate: earningRuleValueSchema.optional(),
      channel: earningRuleValueSchema.optional(),
      franchisee: earningRuleValueSchema.optional(),
    }),
});

type EarningRuleFormValues = z.infer<typeof earningRuleSchema>;

const partnerRoles = {
    affiliate: 'Affiliate Partner',
    super_affiliate: 'Super Affiliate Partner',
    associate: 'Associate Partner',
    channel: 'Channel Partner',
    franchisee: 'Franchisee',
} as const;


export default function PartnerEarningRulesPage() {
    const { toast } = useToast()
    const [defaultRules, setDefaultRules] = React.useState<Property['earningRules']>({});
    const [isLoading, setIsLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm<EarningRuleFormValues>({
        resolver: zodResolver(earningRuleSchema),
        defaultValues: {
            earningRules: {},
        },
    });

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const globalDefaultsDocRef = doc(db, 'app_settings', 'default_earning_rules');
            const docSnap = await getDoc(globalDefaultsDocRef);
            if (docSnap.exists()) {
                setDefaultRules(docSnap.data().earningRules || {});
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const openDialog = () => {
        getDoc(doc(db, 'app_settings', 'default_earning_rules')).then(docSnap => {
            if (docSnap.exists()) {
                form.reset({
                    earningRules: docSnap.data().earningRules || {},
                });
            } else {
                form.reset({
                    earningRules: {},
                });
            }
        });
        setIsDialogOpen(true);
    }

    const onSubmit = async (values: EarningRuleFormValues) => {
        setIsSubmitting(true);
        try {
            const docRef = doc(db, "app_settings", "default_earning_rules");
            await setDoc(docRef, { earningRules: values.earningRules }, { merge: true });

            toast({ title: "Success", description: "Earning rules have been updated successfully." });
            setIsDialogOpen(false);
            form.reset();
            fetchData();
        } catch (error) {
            console.error("Error setting earning rule:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not set the earning rule.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const formatValue = (rule?: EarningRuleValue) => {
        if(!rule || !rule.type) return 'Not Set';
        switch(rule.type) {
            case 'reward_points': return `${rule.value.toLocaleString()} points`;
            case 'commission_percentage': return `${rule.value}%`;
            case 'flat_amount': return `₹${rule.value.toLocaleString()}`;
            case 'per_sq_ft': return `₹${rule.value}/sq.ft for ${rule.totalSqFt || 0} sq.ft. (Total: ₹${(rule.value * (rule.totalSqFt || 0)).toLocaleString()})`;
            default: return 'N/A';
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
                        <Link href="/wallet-billing/payable">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Default Earning Rules</h1>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Default Earning Rules</CardTitle>
                            <CardDescription>These rules apply to all properties unless overridden on a per-property basis.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => openDialog()}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Defaults
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            (Object.keys(partnerRoles) as Array<keyof typeof partnerRoles>).map(role => (
                                <div key={role} className="p-4 border rounded-lg">
                                    <p className="font-semibold text-sm">{partnerRoles[role]}</p>
                                    <p className="text-xs text-muted-foreground">{formatValue(defaultRules?.[role])}</p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

             <Dialog open={isDialogOpen} onOpenChange={open => { if(!open) { setIsDialogOpen(open) }}}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Set Default Earning Rules</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="max-h-[65vh] overflow-y-auto space-y-4 p-2">
                            {(Object.keys(partnerRoles) as Array<keyof typeof partnerRoles>).map(role => (
                                <EarningRuleFormFields key={role} role={role} />
                            ))}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
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
