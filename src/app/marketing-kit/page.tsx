
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, PlusCircle, Upload, Paperclip, Download, Search, Building } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where, getDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Property } from "@/types/property"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { uploadFile } from "@/services/file-upload-service"

const marketingKitSchema = z.object({
  kitType: z.enum(["poster", "brochure", "video"], {
    required_error: "Please select a kit type.",
  }),
  title: z.string().min(1, { message: "Title is required." }),
  featureImage: z.any().optional(),
  files: z.any().optional(),
  propertyId: z.string().optional(),
})

type MarketingKitForm = z.infer<typeof marketingKitSchema>

type KitFile = {
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'video' | 'other';
};

type Kit = {
  id: string;
  title: string;
  type: string;
  featureImage: string;
  files: KitFile[];
  ownerId?: string;
  propertyId?: string;
  propertyTitle?: string;
  previewUrl?: string;
  downloadUrl?: string;
};

const getFileType = (fileName: string): KitFile['type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'mov'].includes(extension || '')) return 'video';
    return 'other';
};


export default function MarketingKitPage() {
  const { toast } = useToast()
  const { user } = useUser();
  const [kits, setKits] = React.useState<Kit[]>([])
  const [allProperties, setAllProperties] = React.useState<Property[]>([])
  const [defaultBusinessInfo, setDefaultBusinessInfo] = React.useState<{name: string, phone: string} | null>(null);
  const [isLoadingKits, setIsLoadingKits] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [propertySearchTerm, setPropertySearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("all")
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  
  const isSeller = user?.role === 'seller';
  const canAddKits = user?.role === 'admin' || isSeller;

  const form = useForm<MarketingKitForm>({
    resolver: zodResolver(marketingKitSchema),
    defaultValues: {
      title: "",
      kitType: "poster",
      featureImage: undefined,
      files: undefined,
      propertyId: "",
    },
  })
  
  const fetchKitsAndProperties = React.useCallback(async () => {
    if (!user) return;
    setIsLoadingKits(true);
    try {
        const kitsCollection = collection(db, "marketing_kits");
        const propsCollection = collection(db, "properties");
        const websiteDefaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));

        const [kitsSnapshot, propsSnapshot] = await Promise.all([
            getDocs(isSeller ? query(kitsCollection, where("ownerId", "==", user.id)) : query(kitsCollection)),
            getDocs(query(propsCollection, where("status", "==", "For Sale")))
        ]);
        
        const propsList = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setAllProperties(propsList);

        if(websiteDefaultsDoc.exists()){
            const defaults = websiteDefaultsDoc.data();
            setDefaultBusinessInfo({
                name: defaults.contactDetails?.name || 'DealFlow',
                phone: defaults.contactDetails?.phone || 'N/A'
            });
        }

        const kitsList = await Promise.all(kitsSnapshot.docs.map(async (docData) => {
            const data = docData.data() as Omit<Kit, 'propertyTitle'>;
            let propertyTitle: string | undefined;
            if (data.propertyId) {
                const prop = propsList.find(p => p.id === data.propertyId);
                propertyTitle = prop?.catalogTitle;
            }
            return { ...data, propertyTitle };
        }));
      
        setKits(kitsList)
    } catch (error) {
      console.error("Error fetching kits:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch marketing kits.",
      })
    } finally {
      setIsLoadingKits(false)
    }
  }, [toast, user, isSeller])

  React.useEffect(() => {
    if (user) {
        fetchKitsAndProperties();
    }
  }, [user, fetchKitsAndProperties])


  async function onSubmit(values: MarketingKitForm) {
    if (!user) return;
    if (!values.featureImage) {
        form.setError("featureImage", { message: "A feature image is required." });
        return;
    }
    setIsSubmitting(true);
    try {
        const featureImageUrl = await uploadFile(values.featureImage);

        const filesData: KitFile[] = [];
        if (values.files && values.files.length > 0) {
            for (const file of Array.from(values.files as FileList)) {
                const fileUrl = await uploadFile(file);
                filesData.push({
                    name: file.name,
                    url: fileUrl,
                    type: getFileType(file.name),
                });
            }
        }


        const kitId = generateUserId("KIT");
        await setDoc(doc(db, "marketing_kits", kitId), {
            id: kitId,
            title: values.title,
            type: values.kitType.charAt(0).toUpperCase() + values.kitType.slice(1),
            ownerId: user.id,
            propertyId: values.propertyId || null,
            featureImage: featureImageUrl,
            files: filesData,
            previewUrl: featureImageUrl,
            downloadUrl: filesData[0]?.url || featureImageUrl,
        });

        setIsSubmitting(false);
        setIsDialogOpen(false);
        form.reset({
            title: "",
            kitType: "poster",
            featureImage: undefined,
            files: undefined,
            propertyId: "",
        });
        setSelectedProperty(null);
        toast({
            title: "Marketing Kit Created",
            description: "Your new marketing kit has been added successfully.",
        });
        fetchKitsAndProperties();
    } catch (error) {
        console.error("Error creating kit:", error);
        toast({
            variant: "destructive",
            title: "Creation Error",
            description: "An unexpected error occurred. Please try again.",
        });
        setIsSubmitting(false);
    }
}

 const handleDownload = async (kit: Kit) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Login Required' });
      return;
    }
    
    if (kit.files.length === 0) {
      toast({
        variant: 'destructive',
        title: "No files to download",
        description: "There are no files uploaded for this kit.",
      });
      return;
    }
  
    setIsDownloading(kit.id);
  
    for (const file of kit.files) {
      try {
        const link = document.createElement("a");
        link.href = file.url;
        link.setAttribute("download", file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error for file:', file.name, error);
        toast({ variant: 'destructive', title: 'Download Failed', description: `Could not download ${file.name}. Please try again.` });
      }
    }
    setIsDownloading(null);
  };

  const filteredKits = React.useMemo(() => {
    return kits
      .filter(kit => {
        if (activeFilter === 'all') return true;
        return kit.type.toLowerCase() === activeFilter;
      })
      .filter(kit =>
        kit.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [kits, activeFilter, searchTerm]);
  
  const filteredProperties = React.useMemo(() => {
    if (!propertySearchTerm) return [];
    return allProperties.filter(p =>
      p.catalogTitle.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(propertySearchTerm.toLowerCase())
    );
  }, [allProperties, propertySearchTerm]);
  
  const handleSelectProperty = (property: Property) => {
      setSelectedProperty(property);
      form.setValue("propertyId", property.id);
      setPropertySearchTerm("");
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Marketing Kits</h1>
        {canAddKits && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Marketing Kit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                <DialogTitle>Add New Marketing Kit</DialogTitle>
                <DialogDescription>
                    Fill out the form below to create a new marketing kit.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="kitType" render={({ field }) => (<FormItem><FormLabel>Kit Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue placeholder="Select a kit type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="poster">Poster</SelectItem><SelectItem value="brochure">Brochure</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Luxury Villa Showcase" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <FormField
                        control={form.control}
                        name="propertyId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Related Property (Optional)</FormLabel>
                                <FormControl>
                                   <div className="space-y-2">
                                        {selectedProperty ? (
                                            <div className="flex items-center gap-4 p-2 border rounded-md">
                                                <Avatar>
                                                    <AvatarImage src={selectedProperty.featureImage} />
                                                    <AvatarFallback><Building/></AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">{selectedProperty.catalogTitle}</p>
                                                    <p className="text-sm text-muted-foreground">{selectedProperty.id}</p>
                                                </div>
                                                <Button variant="ghost" onClick={() => setSelectedProperty(null)}>Change</Button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Search for a property..."
                                                        className="pl-8"
                                                        value={propertySearchTerm}
                                                        onChange={e => setPropertySearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                {propertySearchTerm && (
                                                    <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                                                        {filteredProperties.length > 0 ? filteredProperties.map(p => (
                                                            <div key={p.id} onClick={() => handleSelectProperty(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                                                <p>{p.catalogTitle}</p>
                                                                <p className="text-xs text-muted-foreground">{p.id}</p>
                                                            </div>
                                                        )) : <p className="p-4 text-sm text-center text-muted-foreground">No properties found.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                   </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField control={form.control} name="featureImage" render={({ field: { onChange, value, ...rest }}) => (<FormItem><FormLabel>Feature Image</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="files" render={({ field: { onChange, value, ...rest } }) => (<FormItem><FormLabel>Kit Files (PDF, Image, Video)</FormLabel><FormControl><Input type="file" multiple onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Creating...' : 'Create Kit'}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        )}
      </div>

       <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="brochure">Brochures</TabsTrigger>
            <TabsTrigger value="poster">Posters</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {isLoadingKits ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="p-0">
                        <div className="bg-muted rounded-t-lg aspect-video animate-pulse"></div>
                    </CardHeader>
                     <CardContent className="p-4">
                        <div className="h-5 w-20 rounded-md bg-muted mb-2 animate-pulse"></div>
                        <div className="h-6 w-4/5 rounded-md bg-muted animate-pulse"></div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <div className="h-10 w-full rounded-md bg-muted animate-pulse"></div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
            <p>No marketing kits found.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredKits.map((kit) => (
            <Card key={kit.id} className="flex flex-col">
                <CardHeader className="p-0">
                <Image
                    src={kit.featureImage}
                    alt={kit.title}
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover aspect-video"
                    data-ai-hint="marketing material"
                />
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                <Badge variant="secondary" className="mb-2">{kit.type}</Badge>
                <CardTitle className="text-xl">{kit.title}</CardTitle>
                {kit.propertyTitle && (
                    <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Building className="h-3 w-3" /> {kit.propertyTitle}
                    </CardDescription>
                )}
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button variant="outline" className="w-full" onClick={() => handleDownload(kit)} disabled={isDownloading === kit.id}>
                        {isDownloading === kit.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                        {isDownloading === kit.id ? "Processing..." : "Download Kit"}
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
    </div>
  )
}

    