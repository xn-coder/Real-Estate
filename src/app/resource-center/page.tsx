
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Loader2, PlusCircle, Trash2, Pencil } from "lucide-react"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from 'next/dynamic'
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, Timestamp, updateDoc, deleteDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import type { Resource, Category } from "@/types/resource"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const resourceFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  categoryId: z.string().min(1, "Please select a category."),
  contentType: z.enum(["article", "video", "faq", "terms_condition"]),
  featureImage: z.any().refine(file => file, "Feature image is required."),
  articleContent: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
    if ((data.contentType === "article" || data.contentType === "terms_condition") && (!data.articleContent || data.articleContent.length < 8)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Article content is required.",
        path: ["articleContent"],
       });
    }
    if (data.contentType === "video" && !data.videoUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A valid video URL is required.",
            path: ["videoUrl"],
        });
    }
    if (data.contentType === "faq") {
        if (!data.faqs || data.faqs.length === 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "At least one FAQ item is required.",
                path: ["faqs"],
            });
        } else {
            data.faqs.forEach((faq, index) => {
                if (!faq.question) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Question cannot be empty.",
                        path: [`faqs.${index}.question`],
                    });
                }
                if (!faq.answer) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Answer cannot be empty.",
                        path: [`faqs.${index}.answer`],
                    });
                }
            })
        }
    }
});


type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required."),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;


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

export default function ResourceCenterPage() {
  const { toast } = useToast()
  const [resources, setResources] = React.useState<Resource[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isResourceDialogOpen, setIsResourceDialogOpen] = React.useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false)
  const [editingResource, setEditingResource] = React.useState<Resource | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const resourceForm = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: "",
      contentType: "article",
      faqs: [{ question: "", answer: "" }],
      articleContent: "",
      videoUrl: ""
    },
    mode: "onChange"
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const { fields, append, remove } = useFieldArray({
    control: resourceForm.control,
    name: "faqs",
  });

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const resourcesSnapshot = await getDocs(collection(db, "resources"));
      const categoriesSnapshot = await getDocs(collection(db, "resource_categories"));
      setResources(resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
      setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch data." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (editingResource) {
        resourceForm.reset({
            ...editingResource,
            faqs: editingResource.faqs?.length ? editingResource.faqs : [{ question: "", answer: "" }]
        });
    } else {
        resourceForm.reset({
            title: "",
            contentType: "article",
            categoryId: "",
            faqs: [{ question: "", answer: "" }],
            articleContent: "",
            videoUrl: "",
            featureImage: undefined,
        });
    }
  }, [editingResource, resourceForm]);

  React.useEffect(() => {
    if (editingCategory) {
        categoryForm.reset(editingCategory);
    } else {
        categoryForm.reset({ name: "" });
    }
  }, [editingCategory, categoryForm]);


  const onResourceSubmit = async (values: ResourceFormValues) => {
    setIsSubmitting(true);
    try {
        let featureImageUrl = editingResource?.featureImage || '';
        if (values.featureImage && typeof values.featureImage !== 'string') {
            featureImageUrl = await fileToDataUrl(values.featureImage);
        }
        
        const resourceData: Omit<Resource, 'id' | 'createdAt'> = {
            title: values.title,
            categoryId: values.categoryId,
            contentType: values.contentType,
            featureImage: featureImageUrl,
            articleContent: (values.contentType === 'article' || values.contentType === 'terms_condition') ? (values.articleContent ?? '') : null,
            videoUrl: values.contentType === 'video' ? (values.videoUrl ?? '') : null,
            faqs: values.contentType === 'faq' ? (values.faqs ?? []) : null,
        };

        if (editingResource) {
            await updateDoc(doc(db, "resources", editingResource.id), resourceData);
            toast({ title: "Resource Updated", description: "The resource has been updated." });
        } else {
            const resourceId = generateUserId("RES");
            await setDoc(doc(db, "resources", resourceId), { ...resourceData, id: resourceId, createdAt: Timestamp.now() });
            toast({ title: "Resource Created", description: "The new resource has been added." });
        }

        setIsResourceDialogOpen(false);
        setEditingResource(null);
        await fetchData();
    } catch (error) {
        console.error("Error saving resource:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save resource." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onCategorySubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
        if (editingCategory) {
            await updateDoc(doc(db, "resource_categories", editingCategory.id), values);
            toast({ title: "Category Updated", description: "The category has been updated." });
        } else {
            const categoryId = generateUserId("CAT");
            await setDoc(doc(db, "resource_categories", categoryId), { id: categoryId, name: values.name });
            toast({ title: "Category Created", description: "The new category has been added." });
        }

        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
        await fetchData();
    } catch (error) {
        console.error("Error saving category:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save category." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    try {
        await deleteDoc(doc(db, "resources", resourceId));
        toast({ title: "Resource Deleted", description: "The resource has been removed." });
        await fetchData();
    } catch (error) {
        console.error("Error deleting resource:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete resource." });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
        await deleteDoc(doc(db, "resource_categories", categoryId));
        toast({ title: "Category Deleted", description: "The category has been removed." });
        await fetchData();
    } catch (error) {
        console.error("Error deleting category:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete category." });
    }
    };

  const contentType = resourceForm.watch("contentType");
  const featureImage = resourceForm.watch("featureImage");

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'N/A';
  }

  const contentTypeDisplay: Record<Resource['contentType'], string> = {
    article: 'Article',
    video: 'Video',
    faq: 'FAQs',
    terms_condition: 'Terms & Condition'
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Resource Center</h1>
      </div>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Manage Resources</TabsTrigger>
          <TabsTrigger value="categories">Manage Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Resources</CardTitle>
                    <CardDescription>Add and manage your educational content.</CardDescription>
                </div>
                <Dialog open={isResourceDialogOpen} onOpenChange={(isOpen) => { setIsResourceDialogOpen(isOpen); if (!isOpen) setEditingResource(null); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingResource(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Resource
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingResource ? "Edit Resource" : "Add New Resource"}</DialogTitle>
                            <DialogDescription>Fill out the form to {editingResource ? "update the" : "add a new"} resource.</DialogDescription>
                        </DialogHeader>
                        <Form {...resourceForm}>
                            <form onSubmit={resourceForm.handleSubmit(onResourceSubmit)} className="space-y-4">
                                <FormField
                                    control={resourceForm.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., How to Close a Deal" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={resourceForm.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={resourceForm.control}
                                        name="contentType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Content Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select content type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="article">Article</SelectItem>
                                                        <SelectItem value="video">Video</SelectItem>
                                                        <SelectItem value="faq">FAQs</SelectItem>
                                                        <SelectItem value="terms_condition">Terms & Condition</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={resourceForm.control}
                                    name="featureImage"
                                    render={({ field: { onChange, value, ...rest }}) => (
                                        <FormItem>
                                        <FormLabel>Feature Image</FormLabel>
                                            <div className="flex items-center gap-4">
                                                {featureImage && (
                                                    <Image 
                                                        src={typeof featureImage === 'string' ? featureImage : URL.createObjectURL(featureImage)} 
                                                        alt="Preview" 
                                                        width={100} 
                                                        height={100} 
                                                        className="rounded-md object-cover"
                                                    />
                                                )}
                                                <FormControl>
                                                    <Input type="file" accept="image/*" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                                </FormControl>
                                            </div>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {(contentType === 'article' || contentType === 'terms_condition') && (
                                    <FormField
                                        control={resourceForm.control}
                                        name="articleContent"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Content</FormLabel>
                                            <FormControl>
                                                <RichTextEditor initialData={field.value || ''} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {contentType === 'video' && (
                                    <FormField
                                        control={resourceForm.control}
                                        name="videoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Video URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://youtube.com/watch?v=..." {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {contentType === 'faq' && (
                                    <div className="space-y-4">
                                        <FormLabel>FAQs</FormLabel>
                                        {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md relative">
                                            <div className="flex-1 space-y-2">
                                            <FormField
                                                control={resourceForm.control}
                                                name={`faqs.${index}.question`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Question</FormLabel>
                                                    <FormControl>
                                                    <Input placeholder={`Question ${index + 1}`} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={resourceForm.control}
                                                name={`faqs.${index}.answer`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Answer</FormLabel>
                                                    <FormControl>
                                                    <Input placeholder="Answer" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-6">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ question: "", answer: "" })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add FAQ
                                        </Button>
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {editingResource ? "Save Changes" : "Save Resource"}
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
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                    ) : resources.length === 0 ? (
                         <TableRow><TableCell colSpan={4} className="h-24 text-center">No resources found.</TableCell></TableRow>
                    ) : (
                        resources.map(resource => (
                            <TableRow key={resource.id}>
                                <TableCell>{resource.title}</TableCell>
                                <TableCell>{getCategoryName(resource.categoryId)}</TableCell>
                                <TableCell className="capitalize">{contentTypeDisplay[resource.contentType]}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingResource(resource); setIsResourceDialogOpen(true); }}>
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
                                                    This action cannot be undone. This will permanently delete the resource.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteResource(resource.id)}>Delete</AlertDialogAction>
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
        <TabsContent value="categories">
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Organize your resources by category.</CardDescription>
                    </div>
                    <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => { setIsCategoryDialogOpen(isOpen); if (!isOpen) setEditingCategory(null); }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setEditingCategory(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                            </DialogHeader>
                            <Form {...categoryForm}>
                                <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                                    <FormField
                                        control={categoryForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Category Name</FormLabel>
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
                                            {editingCategory ? "Save Changes" : "Save Category"}
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
                    {isLoading ? (
                        <TableRow><TableCell colSpan={2} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                    ) : categories.length === 0 ? (
                        <TableRow><TableCell colSpan={2} className="h-24 text-center">No categories found.</TableCell></TableRow>
                    ) : (
                        categories.map(cat => (
                            <TableRow key={cat.id}>
                                <TableCell>{cat.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setIsCategoryDialogOpen(true); }}>
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
                                                    This action cannot be undone. This will permanently delete the category.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteCategory(cat.id)}>Delete</AlertDialogAction>
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
