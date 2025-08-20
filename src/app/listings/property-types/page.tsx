
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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Loader2, PlusCircle, Trash2, Pencil, ArrowLeft } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import type { PropertyType } from "@/types/resource"
import { useRouter } from "next/navigation"
import Image from "next/image"

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

const propertyTypeFormSchema = z.object({
  name: z.string().min(1, "Property type name is required."),
  featureImage: z.any().optional(),
});
type PropertyTypeFormValues = z.infer<typeof propertyTypeFormSchema>;

export default function PropertyTypesPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [isPropertyTypeDialogOpen, setIsPropertyTypeDialogOpen] = React.useState(false)
  const [editingPropertyType, setEditingPropertyType] = React.useState<PropertyType | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const propertyTypeForm = useForm<PropertyTypeFormValues>({
    resolver: zodResolver(propertyTypeFormSchema),
    defaultValues: { name: "", featureImage: null },
  });

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
    fetchPropertyTypes();
  }, [fetchPropertyTypes]);
  
  const openPropertyTypeDialog = (propertyType: PropertyType | null) => {
    setEditingPropertyType(propertyType);
    if (propertyType) {
        propertyTypeForm.reset({ name: propertyType.name, featureImage: propertyType.featureImage || null });
    } else {
        propertyTypeForm.reset({ name: "", featureImage: null });
    }
    setIsPropertyTypeDialogOpen(true);
  }

  const onPropertyTypeSubmit = async (values: PropertyTypeFormValues) => {
    setIsSubmitting(true);
    try {
        let imageUrl = editingPropertyType?.featureImage || '';
        if (values.featureImage && typeof values.featureImage !== 'string') {
            imageUrl = await fileToDataUrl(values.featureImage);
        }

        const dataToSave = {
            name: values.name,
            featureImage: imageUrl,
        };
        
        if (editingPropertyType) {
            await updateDoc(doc(db, "property_types", editingPropertyType.id), dataToSave);
            toast({ title: "Property Type Updated", description: "The property type has been updated." });
        } else {
            const propertyTypeId = generateUserId("PT");
            await setDoc(doc(db, "property_types", propertyTypeId), { ...dataToSave, id: propertyTypeId });
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


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Property Types</h1>
        </div>

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
                                                <Input placeholder="e.g., Apartment" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={propertyTypeForm.control}
                                        name="featureImage"
                                        render={({ field: { onChange, value, ...rest} }) => (
                                            <FormItem>
                                                <FormLabel>Feature Image</FormLabel>
                                                {value && <Image src={typeof value === 'string' ? value : URL.createObjectURL(value)} alt="Preview" width={80} height={80} className="rounded-md object-cover"/>}
                                                <FormControl>
                                                    <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
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
                        <TableHead>Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                 <TableBody>
                    {isLoadingTypes ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                    ) : propertyTypes.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No property types found.</TableCell></TableRow>
                    ) : (
                        propertyTypes.map(cat => (
                            <TableRow key={cat.id}>
                                <TableCell>
                                    <Image src={cat.featureImage || 'https://placehold.co/100x100.png'} alt={cat.name} width={40} height={40} className="rounded-md bg-muted object-cover"/>
                                </TableCell>
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
    </div>
  )
}
