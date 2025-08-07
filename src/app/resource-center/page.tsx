
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
import { Loader2, PlusCircle, Trash2, Pencil, Eye } from "lucide-react"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import dynamic from 'next/dynamic'
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs, Timestamp, updateDoc, deleteDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import type { Resource, PropertyType } from "@/types/resource"
import { useUser } from "@/hooks/use-user"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-[242px] w-full rounded-md border border-input flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const baseSchema = z.object({
  title: z.string().min(1, "Title is required."),
  propertyTypeId: z.string().min(1, "Please select a property type."),
  featureImage: z.any().optional(),
});

const articleSchema = baseSchema.extend({
  contentType: z.literal("article"),
  articleContent: z.string().min(8, "Article content is required."), // CKEditor might return `<p></p>`
  videoUrl: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

const termsConditionSchema = baseSchema.extend({
  contentType: z.literal("terms_condition"),
  articleContent: z.string().min(8, "Terms & Condition content is required."),
  videoUrl: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

const videoSchema = baseSchema.extend({
  contentType: z.literal("video"),
  videoUrl: z.string().url("A valid video URL is required.").min(1, "A valid video URL is required."),
  articleContent: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

const faqSchema = baseSchema.extend({
  contentType: z.literal("faq"),
  faqs: z.array(z.object({
    question: z.string().min(1, "Question cannot be empty."),
    answer: z.string().min(1, "Answer cannot be empty."),
  })).min(1, "At least one FAQ item is required."),
  articleContent: z.string().optional(),
  videoUrl: z.string().optional(),
});

const resourceFormSchema = z.discriminatedUnion("contentType", [
    articleSchema,
    videoSchema,
    faqSchema,
    termsConditionSchema,
]);


type ResourceFormValues = z.infer<typeof resourceFormSchema>;


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

const defaultResourceValues: Partial<ResourceFormValues> = {
    title: "",
    contentType: "article" as const,
    propertyTypeId: "",
    faqs: [{ question: "", answer: "" }],
    articleContent: "",
    videoUrl: "",
    featureImage: undefined,
};

export default function ResourceCenterPage() {
  const { toast } = useToast()
  const { user, isLoading: isUserLoading } = useUser();
  const [resources, setResources] = React.useState<Resource[]>([])
  const [propertyTypes, setPropertyTypes] = React.useState<PropertyType[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isResourceDialogOpen, setIsResourceDialogOpen] = React.useState(false)
  const [editingResource, setEditingResource] = React.useState<Resource | null>(null);
  const [viewingResource, setViewingResource] = React.useState<Resource | null>(null);

  const isAdmin = user?.role === 'admin';
  const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);
  const isSeller = user?.role === 'seller';
  const canManage = isAdmin || isSeller;

  const resourceForm = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: defaultResourceValues as ResourceFormValues,
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control: resourceForm.control,
    name: "faqs",
  });

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const resourcesSnapshot = await getDocs(collection(db, "resources"));
      const propertyTypesSnapshot = await getDocs(collection(db, "property_types"));
      setResources(resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
      setPropertyTypes(propertyTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));
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

  const openResourceDialog = (resource: Resource | null) => {
    setEditingResource(resource);
    if (resource) {
        resourceForm.reset({
            ...defaultResourceValues,
            ...resource,
            faqs: resource.faqs?.length ? resource.faqs : [{ question: "", answer: "" }],
            videoUrl: resource.videoUrl || '',
            articleContent: resource.articleContent || '',
            featureImage: resource.featureImage || undefined,
        } as ResourceFormValues);
    } else {
        resourceForm.reset(defaultResourceValues as ResourceFormValues);
    }
    setIsResourceDialogOpen(true);
  }
  
  const closeResourceDialog = () => {
    setIsResourceDialogOpen(false);
    setEditingResource(null);
    resourceForm.reset(defaultResourceValues as ResourceFormValues);
  }

  const onResourceSubmit = async (values: ResourceFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      let featureImageUrl = editingResource?.featureImage || '';
      
      if (values.featureImage && typeof values.featureImage !== 'string') {
        featureImageUrl = await fileToDataUrl(values.featureImage as File);
      }
      
      if (!editingResource && !values.featureImage) {
        resourceForm.setError("featureImage", { message: "Feature image is required." });
        setIsSubmitting(false);
        return;
      }
  
      const resourceData: Omit<Resource, 'id' | 'createdAt'> & { id?: string; createdAt?: Timestamp; ownerId?: string } = {
        title: values.title,
        propertyTypeId: values.propertyTypeId,
        contentType: values.contentType,
        featureImage: featureImageUrl,
        articleContent: values.contentType === 'article' || values.contentType === 'terms_condition' ? values.articleContent || null : null,
        videoUrl: values.contentType === 'video' ? values.videoUrl || null : null,
        faqs: values.contentType === 'faq' ? values.faqs || null : null,
      };
  
      if (editingResource) {
        await updateDoc(doc(db, "resources", editingResource.id), resourceData);
        toast({ title: "Resource Updated", description: "The resource has been updated." });
      } else {
        const resourceId = generateUserId("RES");
        resourceData.id = resourceId;
        resourceData.createdAt = Timestamp.now();
        resourceData.ownerId = user.id;
        await setDoc(doc(db, "resources", resourceId), resourceData);
        toast({ title: "Resource Created", description: "The new resource has been added." });
      }
  
      closeResourceDialog();
      await fetchData();
    } catch (error) {
      console.error("Error saving resource:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save resource." });
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

  const contentType = resourceForm.watch("contentType");
  const featureImage = resourceForm.watch("featureImage");

  const getPropertyTypeName = (propertyTypeId: string) => {
    return propertyTypes.find(c => c.id === propertyTypeId)?.name || 'N/A';
  }

  const contentTypeDisplay: Record<Resource['contentType'], string> = {
    article: 'Article',
    video: 'Video',
    faq: 'FAQs',
    terms_condition: 'Terms & Condition'
  }

  const renderFAQs = (resource: Resource) => (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Find answers to common questions about this topic.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
              {(resource.faqs || []).map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
              ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );

  const renderViewDialogContent = () => {
    if (!viewingResource) return null;

    const renderContent = () => {
      switch (viewingResource.contentType) {
        case 'article':
        case 'terms_condition':
          return (
            <>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: viewingResource.articleContent || '' }}
              />
              {viewingResource.faqs && viewingResource.faqs.length > 0 && renderFAQs(viewingResource)}
            </>
          );
        case 'video':
          return (
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={viewingResource.videoUrl?.replace("watch?v=", "embed/") || ''}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        case 'faq':
          return renderFAQs(viewingResource);
        default:
          return <p>Unsupported content type.</p>;
      }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{viewingResource.title}</DialogTitle>
                <DialogDescription>
                    {contentTypeDisplay[viewingResource.contentType]} - {getPropertyTypeName(viewingResource.propertyTypeId)}
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-4">
                <div className="relative h-48 w-full mb-4">
                    <Image
                        src={viewingResource.featureImage}
                        alt={viewingResource.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                    />
                </div>
                {renderContent()}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setViewingResource(null)}>Close</Button>
            </DialogFooter>
        </>
    );
  };


  if (isUserLoading) {
    return <div className="flex-1 p-4 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Resource Center</h1>
      </div>

       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
            <div>
                <CardTitle>Resources</CardTitle>
                <CardDescription>
                    {canManage ? "Add and manage your educational content." : "Browse available resources."}
                </CardDescription>
            </div>
            {canManage && (
                <Dialog open={isResourceDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeResourceDialog(); else setIsResourceDialogOpen(true); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openResourceDialog(null)}>
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
                                        name="propertyTypeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Property Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a property type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {propertyTypes.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
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
                                                <Select onValueChange={field.onChange} value={field.value}>
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
                                        <FormMessage>
                                            {resourceForm.formState.errors.faqs?.message}
                                        </FormMessage>
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
            )}
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Feature Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : resources.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No resources found.</TableCell></TableRow>
                ) : (
                    resources.map(resource => {
                        const isOwner = user?.id === resource.ownerId;
                        return (
                            <TableRow key={resource.id}>
                                <TableCell>
                                    <Image src={resource.featureImage} alt={resource.title} width={40} height={40} className="rounded-md object-cover" />
                                </TableCell>
                                <TableCell>{resource.title}</TableCell>
                                <TableCell>{getPropertyTypeName(resource.propertyTypeId)}</TableCell>
                                <TableCell className="capitalize">{contentTypeDisplay[resource.contentType]}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setViewingResource(resource)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    {(isAdmin || isOwner) && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => openResourceDialog(resource)}>
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
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
        <Dialog open={!!viewingResource} onOpenChange={(open) => !open && setViewingResource(null)}>
            <DialogContent className="sm:max-w-2xl">
                {renderViewDialogContent()}
            </DialogContent>
        </Dialog>
    </div>
  )
}

    