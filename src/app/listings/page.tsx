
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, CheckCircle, ChevronRight, Loader2, PlusCircle, Hourglass, Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { useUser } from "@/hooks/use-user"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { generateUserId } from "@/lib/utils"
import type { PropertyType } from "@/types/resource"

const propertyTypeFormSchema = z.object({
  name: z.string().min(1, "Property type name is required."),
});
type PropertyTypeFormValues = z.infer<typeof propertyTypeFormSchema>;

export default function ListingsDashboardPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [counts, setCounts] = React.useState({ total: 0, pending: 0 })
  const [isLoading, setIsLoading] = React.useState(true)
  const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [isPropertyTypeDialogOpen, setIsPropertyTypeDialogOpen] = React.useState(false)
  const [editingPropertyType, setEditingPropertyType] = React.useState<PropertyType | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';

  const propertyTypeForm = useForm<PropertyTypeFormValues>({
    resolver: zodResolver(propertyTypeFormSchema),
    defaultValues: { name: "" },
  });

  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const propertiesCollection = collection(db, "properties");
        const totalSnapshot = await getDocs(query(propertiesCollection, where("status", "!=", "Pending Verification")));
        const pendingQuery = query(propertiesCollection, where("status", "==", "Pending Verification"));
        const pendingSnapshot = await getDocs(pendingQuery);
        setCounts({ total: totalSnapshot.size, pending: pendingSnapshot.size });
    } catch (error) {
        console.error("Error fetching property counts:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const fetchPropertyTypes = React.useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const propertyTypesSnapshot = await getDocs(collection(db, "property_types"));
      setPropertyTypes(propertyTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));
    } catch(error) {
       console.error("Error fetching property types:", error);
       toast({ variant: "destructive", title: "Error", description: "Failed to fetch property types." });
    } finally {
      setIsLoadingTypes(false);
    }
  }, [toast]);


  React.useEffect(() => {
    fetchDashboardData();
    fetchPropertyTypes();
  }, [fetchDashboardData, fetchPropertyTypes]);
  
  const openPropertyTypeDialog = (propertyType: PropertyType | null) => {
    setEditingPropertyType(propertyType);
    if (propertyType) {
        propertyTypeForm.reset(propertyType);
    } else {
        propertyTypeForm.reset({ name: "" });
    }
    setIsPropertyTypeDialogOpen(true);
  }

  const onPropertyTypeSubmit = async (values: PropertyTypeFormValues) => {
    setIsSubmitting(true);
    try {
        if (editingPropertyType) {
            await updateDoc(doc(db, "property_types", editingPropertyType.id), values);
            toast({ title: "Property Type Updated", description: "The property type has been updated." });
        } else {
            const propertyTypeId = generateUserId("PT");
            await setDoc(doc(db, "property_types", propertyTypeId), { id: propertyTypeId, name: values.name });
            toast({ title: "Property Type Created", description: "The new property type has been added." });
        }
        setIsPropertyTypeDialogOpen(false);
        setEditingPropertyType(null);
        await fetchPropertyTypes();
    } catch (error) {
        console.error("Error saving property type:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save property type." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const deletePropertyType = async (propertyTypeId: string) => {
    try {
        await deleteDoc(doc(db, "property_types", propertyTypeId));
        toast({ title: "Property Type Deleted", description: "The property type has been removed." });
        await fetchPropertyTypes();
    } catch (error) {
        console.error("Error deleting property type:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete property type." });
    }
  };

  const statCards = [
    { title: "Total Properties", count: counts.total, icon: Building, color: "text-blue-500" },
    { title: "Pending Verification", count: counts.pending, icon: Hourglass, color: "text-yellow-500" },
  ];

  const dashboardItems = [
    { name: "List of Properties", href: "/listings/list", icon: Building },
    { name: "Pending Properties", href: "/listings/pending", icon: Hourglass },
  ];
  
  const adminDashboardItems = [
    { name: "List of Properties", href: "/listings/list", icon: Building },
    { name: "Admin View Properties", href: "/listings/admin-list", icon: Eye },
    { name: "Pending Properties", href: "/listings/pending", icon: Hourglass },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Properties</h1>
         {(isSeller || isAdmin) && (
            <Button asChild>
                <Link href="/listings/add">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Property
                </Link>
            </Button>
         )}
      </div>

       <div className="grid gap-4 md:grid-cols-2">
        {statCards.map((stat) => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> : <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : stat.count}
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="property-types">Manage Property Types</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
             <Card>
                <CardHeader>
                  <CardTitle>Manage Properties</CardTitle>
                  <CardDescription>View and manage all property listings.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {(isAdmin ? adminDashboardItems : dashboardItems).map((option) => (
                      <Link href={option.href} key={option.name}>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-4">
                                <option.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{option.name}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
        </TabsContent>
        <TabsContent value="property-types">
             <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Property Types</CardTitle>
                            <CardDescription>Manage property types for resources and listings.</CardDescription>
                        </div>
                         <Dialog open={isPropertyTypeDialogOpen} onOpenChange={(isOpen) => { setIsPropertyTypeDialogOpen(isOpen); if (!isOpen) setEditingPropertyType(null); }}>
                            <DialogTrigger asChild>
                                <Button onClick={() => openPropertyTypeDialog(null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Property Type
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{editingPropertyType ? "Edit Property Type" : "Add New Property Type"}</DialogTitle>
                                </DialogHeader>
                                <Form {...propertyTypeForm}>
                                    <form onSubmit={propertyTypeForm.handleSubmit(onPropertyTypeSubmit)} className="space-y-4">
                                        <FormField
                                            control={propertyTypeForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Property Type Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Sales Training" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {editingPropertyType ? "Save Changes" : "Save Property Type"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {isLoadingTypes ? (
                            <TableRow><TableCell colSpan={2} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : propertyTypes.length === 0 ? (
                            <TableRow><TableCell colSpan={2} className="h-24 text-center">No property types found.</TableCell></TableRow>
                        ) : (
                            propertyTypes.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openPropertyTypeDialog(cat)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                               <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the property type.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deletePropertyType(cat.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                     </TableBody>
                  </Table>
                </CardContent>
              </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
