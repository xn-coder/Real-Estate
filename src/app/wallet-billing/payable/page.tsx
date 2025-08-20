
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
import { collection, getDocs, query, orderBy, doc, updateDoc, setDoc } from "firebase/firestore"
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


export default function PartnerEarningPage() {
    const { toast } = useToast()
    const [properties, setProperties] = React.useState<Property[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

    const form = useForm<EarningRuleFormValues>({
        resolver: zodResolver(earningRuleSchema),
        defaultValues: {
            earningRules: {},
        },
    });

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const propertiesSnapshot = await getDocs(query(collection(db, "properties"), orderBy("catalogTitle")));
            const propsList = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
            setProperties(propsList);

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
    
    const openDialog = (property?: Property) => {
        if (property) {
            setSelectedProperty(property);
            form.reset({
                propertyId: property.id,
                earningRules: property.earningRules || {},
            });
        } else {
            setSelectedProperty(null);
            // Fetch and set global defaults if they exist
             const globalDefaultsDocRef = doc(db, 'app_settings', 'default_earning_rules');
             getDoc(globalDefaultsDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    form.reset({
                        propertyId: '',
                        earningRules: docSnap.data().earningRules || {},
                    });
                } else {
                    form.reset({
                        propertyId: '',
                        earningRules: {},
                    });
                }
             });
        }
        setIsDialogOpen(true);
    }

    const onSubmit = async (values: EarningRuleFormValues) => {
        setIsSubmitting(true);
        try {
            const docRef = selectedProperty 
                ? doc(db, "properties", selectedProperty.id)
                : doc(db, "app_settings", "default_earning_rules");
            
            await setDoc(docRef, { earningRules: values.earningRules }, { merge: true });

            toast({ title: "Success", description: "Earning rules have been updated successfully." });
            setIsDialogOpen(false);
            form.reset();
            setSelectedProperty(null);
            if(selectedProperty) fetchData(); // Only refetch if a property was edited
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
                        <Link href="/wallet-billing">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Partner Earning Rules</h1>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={open => { if(!open) setSelectedProperty(null); setIsDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Set Default Earning
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>{selectedProperty ? `Edit Earning Rules for ${selectedProperty.catalogTitle}` : "Set Default Earning Rules"}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                               <div className="max-h-[55vh] overflow-y-auto space-y-4 p-2">
                                {(Object.keys(partnerRoles) as Array<keyof typeof partnerRoles>).map(role => (
                                    <EarningRuleFormFields key={role} role={role} />
                                ))}
                               </div>
                                <DialogFooter>
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
            
             <Card>
                <CardHeader>
                    <CardTitle>Per-Property Earning Rules</CardTitle>
                    <CardDescription>Earning rules set for each property. These will override the global defaults.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {properties.map(property => (
                            <AccordionItem value={property.id} key={property.id}>
                                <div className="flex items-center w-full">
                                    <AccordionTrigger className="flex-1">
                                        <span>{property.catalogTitle}</span>
                                    </AccordionTrigger>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDialog(property); }} className="mr-2">Edit</Button>
                                </div>
                              <AccordionContent>
                                <div className="grid grid-cols-2 gap-4 p-4">
                                {Object.keys(partnerRoles).map(role => (
                                    <div key={role} className="text-sm">
                                        <p className="font-semibold">{partnerRoles[role as keyof typeof partnerRoles]}</p>
                                        <p className="text-muted-foreground">{formatValue(property.earningRules?.[role as keyof typeof property.earningRules])}</p>
                                    </div>
                                ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

