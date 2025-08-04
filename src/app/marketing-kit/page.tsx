
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
import { Loader2, PlusCircle, Upload, Paperclip, Download } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"

const marketingKitSchema = z.object({
  kitType: z.enum(["poster", "brochure"], {
    required_error: "Please select a kit type.",
  }),
  title: z.string().min(1, { message: "Title is required." }),
  featureImage: z.any().refine(file => file, "Feature image is required."),
  files: z.any().optional(),
})

type MarketingKitForm = z.infer<typeof marketingKitSchema>

type KitFile = {
    name: string;
    url: string;
};

type Kit = {
  id: string;
  title: string;
  type: string;
  featureImage: string;
  files: KitFile[];
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
      files: [{ name: 'brochure.pdf', url: 'https://placehold.co/600x400.png' }],
    },
    {
      id: 'kit2',
      title: 'Downtown Apartment Posters',
      type: 'Poster',
      featureImage: 'https://placehold.co/600x400.png',
      files: [{ name: 'poster.pdf', url: 'https://placehold.co/600x400.png' }],
    },
    {
      id: 'kit3',
      title: 'Suburban Family Homes',
      type: 'Brochure',
      featureImage: 'https://placehold.co/600x400.png',
      files: [{ name: 'family_homes.pdf', url: 'https://placehold.co/600x400.png' }],
    },
  ];

export default function MarketingKitPage() {
  const { toast } = useToast()
  const { user } = useUser();
  const [kits, setKits] = React.useState<Kit[]>(initialKits)
  const [isLoadingKits, setIsLoadingKits] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const featureImageRef = React.useRef<HTMLInputElement>(null)
  const filesRef = React.useRef<HTMLInputElement>(null)

  const isAdmin = user?.role === 'admin';

  const form = useForm<MarketingKitForm>({
    resolver: zodResolver(marketingKitSchema),
    defaultValues: {
      title: "",
    },
  })
  
  const fetchKits = React.useCallback(async () => {
    setIsLoadingKits(true)
    try {
      const kitsCollection = collection(db, "marketing_kits")
      const kitsSnapshot = await getDocs(kitsCollection)
      const kitsList = kitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kit))
      if (kitsList.length > 0) {
        setKits(kitsList)
      }
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
  }, [toast])

  React.useEffect(() => {
    fetchKits()
  }, [fetchKits])


  async function onSubmit(values: MarketingKitForm) {
    setIsSubmitting(true)
    try {
        const featureImageUrl = await fileToDataUrl(values.featureImage);
        
        let fileUrls: KitFile[] = [];
        if (values.files && values.files.length > 0) {
            fileUrls = await Promise.all(
                Array.from(values.files as FileList).map(async (file) => ({
                    name: file.name,
                    url: await fileToDataUrl(file),
                }))
            );
        }

        const kitId = generateUserId("KIT");
        await setDoc(doc(db, "marketing_kits", kitId), {
            id: kitId,
            title: values.title,
            type: values.kitType === "poster" ? "Poster" : "Brochure",
            featureImage: featureImageUrl,
            files: fileUrls,
        });

      setIsSubmitting(false)
      setIsDialogOpen(false)
      form.reset()
      if (featureImageRef.current) featureImageRef.current.value = "";
      if (filesRef.current) filesRef.current.value = "";
      toast({
        title: "Marketing Kit Created",
        description: "Your new marketing kit has been added successfully.",
      })
      fetchKits();
    } catch(error) {
        console.error("Error creating kit:", error)
        toast({
            variant: "destructive",
            title: "Creation Error",
            description: "An unexpected error occurred. Please try again.",
        })
        setIsSubmitting(false)
    }
  }

  const handleDownload = (kit: Kit) => {
    if (kit.files.length === 0) {
      toast({
        variant: 'destructive',
        title: "No files to download",
        description: "There are no files uploaded for this kit.",
      });
      return;
    }

    kit.files.forEach(file => {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const featureImage = form.watch("featureImage")
  const uploadedFiles = form.watch("files")

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Marketing Kits</h1>
        {isAdmin && (
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
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Feature Image</FormLabel>
                        <div className="flex items-center gap-4">
                            <div className="w-32 h-20 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            {featureImage && (
                                <Image
                                src={URL.createObjectURL(featureImage)}
                                alt="Feature preview"
                                width={128}
                                height={80}
                                className="object-cover w-full h-full"
                                />
                            )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => featureImageRef.current?.click()} disabled={isSubmitting}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                            </Button>
                        </div>
                        <FormControl>
                            <Input 
                                type="file" 
                                className="hidden" 
                                ref={featureImageRef}
                                onChange={(e) => field.onChange(e.target.files?.[0])}
                                accept="image/*"
                                disabled={isSubmitting}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="files"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Upload Files (PDF/Image)</FormLabel>
                        <FormControl>
                            <Button type="button" variant="outline" className="w-full" onClick={() => filesRef.current?.click()} disabled={isSubmitting}>
                            <Paperclip className="mr-2 h-4 w-4" />
                            Select Files
                            </Button>
                        </FormControl>
                        <Input
                            type="file"
                            className="hidden"
                            ref={filesRef}
                            onChange={(e) => field.onChange(e.target.files)}
                            multiple
                            accept="image/*,application/pdf"
                            disabled={isSubmitting}
                        />
                        <FormMessage />
                        {uploadedFiles && uploadedFiles.length > 0 && (
                            <div className="text-sm text-muted-foreground space-y-1 pt-2">
                            {Array.from(uploadedFiles as FileList).map((file, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Paperclip className="h-4 w-4"/>
                                    <span>{file.name}</span>
                                </div>
                            ))}
                            </div>
                        )}
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
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
                    <Button variant="outline" className="w-full" onClick={() => handleDownload(kit)}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download Kit
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
    </div>
  )
}
