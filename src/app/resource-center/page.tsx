
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
import { Loader2, PlusCircle, Upload, X, Trash2 } from "lucide-react"
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
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import type { Resource, Category, FaqItem } from "@/types/resource"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const resourceFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  contentType: z.enum(["article", "video", "faq"], { required_error: "Content type is required." }),
  featureImage: z.any().refine(file => file, "Feature image is required."),
  articleContent: z.string().optional(),
  videoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  faqs: z.array(z.object({
    question: z.string().min(1, "Question cannot be empty."),
    answer: z.string().min(1, "Answer cannot be empty."),
  })).optional(),
}).superRefine((data, ctx) => {
    if (data.contentType === "article" && (!data.articleContent || data.articleContent.length < 8)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Article content is required.",
        path: ["articleContent"],
       });
    }
    if (data.contentType === "video" && !data.videoUrl) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video URL is required.",
        path: ["videoUrl"],
       });
    }
     if (data.contentType === "faq" && (!data.faqs || data.faqs.length === 0 || data.faqs.some(f => !f.question || !f.answer))) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one complete FAQ item is required.",
        path: ["faqs"],
       });
    }
});


type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required."),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;


const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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

  const resourceForm = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: "",
      contentType: "article",
      faqs: [{ question: "", answer: "" }],
      articleContent: "",
      videoUrl: ""
    },
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

  const onResourceSubmit = async (values: ResourceFormValues) => {
    setIsSubmitting(true);
    try {
        const featureImageUrl = await fileToDataUrl(values.featureImage);
        const resourceId = generateUserId("RES");
        const resourceData: Omit<Resource, 'id'> = {
            title: values.title,
            categoryId: values.categoryId,
            contentType: values.contentType,
            featureImage: featureImageUrl,
            articleContent: values.contentType === 'article' ? values.articleContent || null : null,
            videoUrl: values.contentType === 'video' ? values.videoUrl || null : null,
            faqs: values.contentType === 'faq' ? values.faqs || null : null,
            createdAt: new Date(),
        };
        await setDoc(doc(db, "resources", resourceId), {id: resourceId, ...resourceData});

        toast({ title: "Resource Created", description: "The new resource has been added." });
        setIsResourceDialogOpen(false);
        resourceForm.reset({
            title: "",
            categoryId: undefined,
            contentType: "article",
            faqs: [{ question: "", answer: "" }],
            articleContent: "",
            videoUrl: "",
            featureImage: undefined,
        });
        fetchData();
    } catch (error) {
        console.error("Error creating resource:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to create resource." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onCategorySubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
        const categoryId = generateUserId("CAT");
        await setDoc(doc(db, "resource_categories", categoryId), { id: categoryId, name: values.name });
        toast({ title: "Category Created", description: "The new category has been added." });
        setIsCategoryDialogOpen(false);
        categoryForm.reset();
        fetchData();
    } catch (error) {
        console.error("Error creating category:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to create category." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const contentType = resourceForm.watch("contentType");
  const featureImage = resourceForm.watch("featureImage");

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'N/A';
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
            <CardHeader className="relative">
              <CardTitle>Resources</CardTitle>
              <CardDescription>Add and manage your educational content.</CardDescription>
              <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="absolute top-6 right-6">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Resource
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Resource</DialogTitle>
                        <DialogDescription>Fill out the form to add a new resource.</DialogDescription>
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
                                            {value && <Image src={typeof value === 'string' ? value : URL.createObjectURL(value)} alt="Preview" width={100} height={100} className="rounded-md object-cover"/>}
                                            <FormControl>
                                                <Input type="file" accept="image/*" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                            </FormControl>
                                        </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {contentType === 'article' && (
                                <FormField
                                    control={resourceForm.control}
                                    name="articleContent"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Article Content</FormLabel>
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
                                            <Input placeholder="https://youtube.com/watch?v=..." {...field} />
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
                                                <FormLabel>Question</FormLabel>
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
                                                <FormLabel>Answer</FormLabel>
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
                            <FormMessage>{resourceForm.formState.errors.root?.message}</FormMessage>

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Resource"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
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
                                <TableCell className="capitalize">{resource.contentType}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
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
            <CardHeader className="relative flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize your resources by category.</CardDescription>
              </div>
               <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
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
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Category"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Actions</TableHead>
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
                                <TableCell>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
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

    