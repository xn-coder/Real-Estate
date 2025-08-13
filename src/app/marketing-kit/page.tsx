
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
import { Loader2, PlusCircle, Upload, Paperclip, Download, Search } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const marketingKitSchema = z.object({
  kitType: z.enum(["poster", "brochure", "video"], {
    required_error: "Please select a kit type.",
  }),
  title: z.string().min(1, { message: "Title is required." }),
  featureImage: z.any().refine(file => file, "Feature image is required."),
  files: z.any().refine(files => files?.length > 0, "At least one file is required."),
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
};

const getFileType = (fileName: string): KitFile['type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'mov'].includes(extension || '')) return 'video';
    return 'other';
};


const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const initialKits: Kit[] = [
    {
      id: 'kit1',
      title: 'Modern Villa Showcase',
      type: 'Brochure',
      featureImage: 'https://placehold.co/600x400.png',
      files: [{ name: 'brochure.pdf', url: 'https://placehold.co/600x400.png', type: 'pdf' }],
    },
    {
      id: 'kit2',
      title: 'Downtown Apartment Posters',
      type: 'Poster',
      featureImage: 'https://placehold.co/600x400.png',
      files: [{ name: 'poster.jpg', url: 'https://placehold.co/600x400.png', type: 'image' }],
    },
    {
      id: 'kit3',
      title: 'Suburban Family Homes',
      type: 'Brochure',
      featureImage: 'https://placehold.co/600x400.png',
      files: [{ name: 'family_homes.pdf', url: 'https://placehold.co/600x400.png', type: 'pdf' }],
    },
  ];

export default function MarketingKitPage() {
  const { toast } = useToast()
  const { user } = useUser();
  const [kits, setKits] = React.useState<Kit[]>(initialKits)
  const [isLoadingKits, setIsLoadingKits] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("all")
  
  const isSeller = user?.role === 'seller';
  const canAddKits = user?.role === 'admin' || isSeller;

  const form = useForm<MarketingKitForm>({
    resolver: zodResolver(marketingKitSchema),
    defaultValues: {
      title: "",
      kitType: "poster",
      featureImage: undefined,
      files: undefined,
    },
  })
  
  const fetchKits = React.useCallback(async () => {
    if (!user) return;
    setIsLoadingKits(true)
    try {
      const kitsCollection = collection(db, "marketing_kits")
      let q;
      if (isSeller) {
          q = query(kitsCollection, where("ownerId", "==", user.id));
      } else {
          q = query(kitsCollection);
      }
      
      const kitsSnapshot = await getDocs(q)
      const kitsList = kitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kit))
      
      if (!isSeller && kitsList.length === 0) {
        setKits(initialKits);
      } else {
        setKits(kitsList)
      }
    } catch (error) {
      console.error("Error fetching kits:", error)
      if (!isSeller) setKits(initialKits);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch marketing kits. Showing sample data.",
      })
    } finally {
      setIsLoadingKits(false)
    }
  }, [toast, user, isSeller])

  React.useEffect(() => {
    if (user) {
        fetchKits();
    }
  }, [user, fetchKits])


  async function onSubmit(values: MarketingKitForm) {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const featureImageUrl = await fileToDataUrl(values.featureImage as File);

        const filesData: KitFile[] = [];
        for (const file of Array.from(values.files as FileList)) {
            const fileUrl = await fileToDataUrl(file);
            filesData.push({
                name: file.name,
                url: fileUrl,
                type: getFileType(file.name),
            });
        }

        const kitId = generateUserId("KIT");
        await setDoc(doc(db, "marketing_kits", kitId), {
            id: kitId,
            title: values.title,
            type: values.kitType.charAt(0).toUpperCase() + values.kitType.slice(1),
            ownerId: user.id, // Assign ownership
            featureImage: featureImageUrl,
            files: filesData,
        });

        setIsSubmitting(false);
        setIsDialogOpen(false);
        form.reset();
        toast({
            title: "Marketing Kit Created",
            description: "Your new marketing kit has been added successfully.",
        });
        fetchKits();
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

 const embedProfileWithCanvas = (baseImageUri: string, logoImageUri: string, businessName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));

        const baseImage = new window.Image();
        baseImage.crossOrigin = "Anonymous";
        baseImage.onload = () => {
            canvas.width = baseImage.width;
            canvas.height = baseImage.height;
            ctx.drawImage(baseImage, 0, 0);

            const logoImage = new window.Image();
            logoImage.crossOrigin = "Anonymous";
            logoImage.onload = () => {
                const padding = canvas.width * 0.02;
                const logoHeight = canvas.height * 0.1;
                const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
                const logoX = canvas.width - logoWidth - padding;
                const logoY = canvas.height - logoHeight - padding;

                ctx.font = `${canvas.height * 0.04}px Arial`;
                const textMetrics = ctx.measureText(businessName);
                const textWidth = textMetrics.width;
                const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
                
                const textX = logoX - textWidth - (padding * 0.5);
                const textY = logoY + logoHeight / 2 + textHeight / 2;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(textX - padding * 0.5, logoY, textWidth + padding, logoHeight);

                ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
                ctx.fillStyle = 'white';
                ctx.fillText(businessName, textX, textY);
                
                resolve(canvas.toDataURL('image/png'));
            };
            logoImage.onerror = () => reject(new Error('Failed to load logo image.'));
            logoImage.src = logoImageUri;
        };
        baseImage.onerror = () => reject(new Error('Failed to load base image.'));
        baseImage.src = baseImageUri;
    });
};

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
        let fileUrl = file.url;
        let fileName = file.name;

        if (file.type === 'image' && user.businessLogo && user.businessName) {
            try {
                const brandedImageUri = await embedProfileWithCanvas(file.url, user.businessLogo, user.businessName);
                fileUrl = brandedImageUri;
                const extension = file.name.split('.').pop();
                fileName = `${file.name.replace(`.${extension}`, '')}_branded.png`;
            } catch (e) {
                console.error("Failed to embed profile on image:", e);
                toast({ variant: 'destructive', title: 'Image Branding Failed', description: 'Could not personalize image.' });
            }
        }

        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <FormField
                    control={form.control}
                    name="kitType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kit Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a kit type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="poster">Poster</SelectItem>
                            <SelectItem value="brochure">Brochure</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Luxury Villa Showcase" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="featureImage"
                        render={({ field: { onChange, ...fieldProps } }) => (
                            <FormItem>
                                <FormLabel>Feature Image</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...fieldProps} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="files"
                        render={({ field: { onChange, ...fieldProps } }) => (
                            <FormItem>
                                <FormLabel>Kit Files (PDF, Image, Video)</FormLabel>
                                <FormControl>
                                    <Input type="file" multiple onChange={(e) => onChange(e.target.files)} {...fieldProps} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
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
            <Card key={kit.id}>
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
                <CardContent className="p-4">
                <Badge variant="secondary" className="mb-2">{kit.type}</Badge>
                <CardTitle className="text-xl">{kit.title}</CardTitle>
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
