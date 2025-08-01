
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
import { marketingKits } from "@/lib/data"
import { Loader2, PlusCircle, Upload, Paperclip, Download } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

const marketingKitSchema = z.object({
  kitType: z.enum(["poster", "brochure"], {
    required_error: "Please select a kit type.",
  }),
  title: z.string().min(1, { message: "Title is required." }),
  featureImage: z.any().optional(),
  files: z.any().optional(),
})

type MarketingKitForm = z.infer<typeof marketingKitSchema>

export default function MarketingKitPage() {
  const { toast } = useToast()
  const [kits, setKits] = React.useState(marketingKits)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const featureImageRef = React.useRef<HTMLInputElement>(null)
  const filesRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<MarketingKitForm>({
    resolver: zodResolver(marketingKitSchema),
    defaultValues: {
      title: "",
    },
  })

  function onSubmit(values: MarketingKitForm) {
    setIsSubmitting(true)
    console.log(values)
    // Simulate API call
    setTimeout(() => {
      const newKit = {
        id: `kit${kits.length + 1}`,
        title: values.title,
        type: values.kitType === "poster" ? "Poster" : "Brochure",
        featureImage: values.featureImage ? URL.createObjectURL(values.featureImage) : 'https://placehold.co/600x400.png',
        files: values.files ? Array.from(values.files as FileList).map(f => f.name) : []
      }
      setKits(prev => [...prev, newKit])
      setIsSubmitting(false)
      setIsDialogOpen(false)
      form.reset()
      toast({
        title: "Marketing Kit Created",
        description: "Your new marketing kit has been added successfully.",
      })
    }, 1000)
  }

  const featureImage = form.watch("featureImage")
  const uploadedFiles = form.watch("files")

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Marketing Kits</h1>
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
      </div>

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
                <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4"/>
                    Download Kit
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
