
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Pencil, Upload, Globe, Instagram, Facebook, Youtube, Twitter, Linkedin, Building, Image as ImageIcon, Contact, FileText, Info, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

// Schemas for forms
const businessProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessLogo: z.any().optional(),
})
const slideshowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  bannerImage: z.any().optional(),
  linkUrl: z.string().url().optional().or(z.literal('')),
})
const contactDetailsSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email(),
  address: z.string().min(1, "Address is required"),
})
const aboutLegalSchema = z.object({
  aboutText: z.string().min(1, "About text is required"),
  termsLink: z.any().optional(),
  privacyLink: z.any().optional(),
  disclaimerLink: z.any().optional(),
})
const socialLinksSchema = z.object({
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
})

// Mock data
const mockData = {
  businessProfile: { businessName: 'Prestige Properties', businessLogo: 'https://placehold.co/100x100.png' },
  slideshow: { title: 'Find Your Dream Home With Us', bannerImage: 'https://placehold.co/1200x400.png', linkUrl: 'https://example.com/listings' },
  contactDetails: { contactName: 'John Doe', phone: '123-456-7890', email: 'contact@prestigeproperties.com', address: '123 Luxury Ave, Suite 100, Realville, 12345' },
  aboutLegal: { aboutText: 'Your trusted partner in finding the perfect property. We specialize in luxury homes and commercial real estate, offering unparalleled service and expertise.' },
  socialLinks: { website: 'https://example.com', instagram: 'https://instagram.com', facebook: 'https://facebook.com', youtube: '', twitter: '', linkedin: 'https://linkedin.com' }
}

export default function ManageWebsitePage() {
  const { toast } = useToast()
  
  const [data, setData] = React.useState(mockData)
  
  const businessProfileForm = useForm<z.infer<typeof businessProfileSchema>>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: data.businessProfile
  });
  const slideshowForm = useForm<z.infer<typeof slideshowSchema>>({
    resolver: zodResolver(slideshowSchema),
    defaultValues: data.slideshow
  });
  const contactDetailsForm = useForm<z.infer<typeof contactDetailsSchema>>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: data.contactDetails
  });
  const aboutLegalForm = useForm<z.infer<typeof aboutLegalSchema>>({
    resolver: zodResolver(aboutLegalSchema),
    defaultValues: { aboutText: data.aboutLegal.aboutText }
  });
  const socialLinksForm = useForm<z.infer<typeof socialLinksSchema>>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: data.socialLinks
  });

  const handleSave = (section: keyof typeof mockData, values: any) => {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("Saving", section, values)
            setData(prev => ({...prev, [section]: {...prev[section], ...values}}))
            toast({ title: "Success", description: `${section.replace(/([A-Z])/g, ' $1')} updated successfully.` })
            resolve(true)
        }, 1000)
    })
  }

  const renderSocialLink = (label: string, url: string | undefined, Icon: React.ElementType) => (
    <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 truncate">{url || 'Not set'}</span>
    </div>
  )

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Website</h1>
      </div>
      <div className="space-y-6">

        {/* Business Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Business Profile</CardTitle>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <a href={data.socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Preview
                    </a>
                </Button>
                <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Business Profile</DialogTitle></DialogHeader>
                    <Form {...businessProfileForm}>
                    <form onSubmit={businessProfileForm.handleSubmit((values) => handleSave('businessProfile', values))} className="space-y-4">
                        <FormField control={businessProfileForm.control} name="businessName" render={({ field }) => ( <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={businessProfileForm.control} name="businessLogo" render={({ field }) => ( <FormItem><FormLabel>Business Logo</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem> )} />
                        <DialogFooter><Button type="submit" disabled={businessProfileForm.formState.isSubmitting}>{businessProfileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
                </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-20 w-20"><AvatarImage src={data.businessProfile.businessLogo} /><AvatarFallback>Logo</AvatarFallback></Avatar>
            <p className="text-lg font-semibold">{data.businessProfile.businessName}</p>
          </CardContent>
        </Card>
        
        {/* Slideshow Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Slideshow</CardTitle>
            </div>
             <Dialog>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Slideshow</DialogTitle></DialogHeader>
                 <Form {...slideshowForm}>
                  <form onSubmit={slideshowForm.handleSubmit((values) => handleSave('slideshow', values))} className="space-y-4">
                    <FormField control={slideshowForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={slideshowForm.control} name="bannerImage" render={({ field }) => ( <FormItem><FormLabel>Banner Image</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={slideshowForm.control} name="linkUrl" render={({ field }) => ( <FormItem><FormLabel>Link URL</FormLabel><FormControl><Input placeholder="https://example.com/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={slideshowForm.formState.isSubmitting}>{slideshowForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Link href={data.slideshow.linkUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Image src={data.slideshow.bannerImage} alt="Banner" width={800} height={200} className="w-full object-cover rounded-md" />
            </Link>
             <p className="mt-2 text-center font-medium">{data.slideshow.title}</p>
          </CardContent>
        </Card>

        {/* Contact Details Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Contact className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Contact Details</CardTitle>
            </div>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Contact Details</DialogTitle></DialogHeader>
                 <Form {...contactDetailsForm}>
                  <form onSubmit={contactDetailsForm.handleSubmit((values) => handleSave('contactDetails', values))} className="space-y-4">
                    <FormField control={contactDetailsForm.control} name="contactName" render={({ field }) => ( <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={contactDetailsForm.formState.isSubmitting}>{contactDetailsForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Name:</strong> {data.contactDetails.contactName}</p>
            <p><strong>Phone:</strong> {data.contactDetails.phone}</p>
            <p><strong>Email:</strong> {data.contactDetails.email}</p>
            <p><strong>Address:</strong> {data.contactDetails.address}</p>
          </CardContent>
        </Card>

        {/* About & Legal Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="h-6 w-6 text-muted-foreground" />
              <CardTitle>About & Legal</CardTitle>
            </div>
             <Dialog>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit About & Legal</DialogTitle></DialogHeader>
                 <Form {...aboutLegalForm}>
                  <form onSubmit={aboutLegalForm.handleSubmit((values) => handleSave('aboutLegal', values))} className="space-y-4">
                    <FormField control={aboutLegalForm.control} name="aboutText" render={({ field }) => ( <FormItem><FormLabel>About Text</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={aboutLegalForm.control} name="termsLink" render={({ field }) => ( <FormItem><FormLabel>Terms & Conditions (PDF)</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={aboutLegalForm.control} name="privacyLink" render={({ field }) => ( <FormItem><FormLabel>Privacy Policy (PDF)</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={aboutLegalForm.control} name="disclaimerLink" render={({ field }) => ( <FormItem><FormLabel>Disclaimer (PDF)</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={aboutLegalForm.formState.isSubmitting}>{aboutLegalForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">About Us</h4>
              <p className="text-sm text-muted-foreground">{data.aboutLegal.aboutText}</p>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Terms & Conditions: <a href="#" className="text-primary underline">view_file.pdf</a></span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Privacy Policy: <a href="#" className="text-primary underline">privacy.pdf</a></span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Disclaimer: <a href="#" className="text-primary underline">disclaimer.pdf</a></span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
             <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Social Links</CardTitle>
            </div>
             <Dialog>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Social Links</DialogTitle></DialogHeader>
                 <Form {...socialLinksForm}>
                  <form onSubmit={socialLinksForm.handleSubmit((values) => handleSave('socialLinks', values))} className="space-y-4">
                    <FormField control={socialLinksForm.control} name="website" render={({ field }) => ( <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={socialLinksForm.control} name="instagram" render={({ field }) => ( <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={socialLinksForm.control} name="facebook" render={({ field }) => ( <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={socialLinksForm.control} name="youtube" render={({ field }) => ( <FormItem><FormLabel>YouTube URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={socialLinksForm.control} name="twitter" render={({ field }) => ( <FormItem><FormLabel>Twitter URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={socialLinksForm.control} name="linkedin" render={({ field }) => ( <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={socialLinksForm.formState.isSubmitting}>{socialLinksForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            {renderSocialLink('Website', data.socialLinks.website, Globe)}
            {renderSocialLink('Instagram', data.socialLinks.instagram, Instagram)}
            {renderSocialLink('Facebook', data.socialLinks.facebook, Facebook)}
            {renderSocialLink('YouTube', data.socialLinks.youtube, Youtube)}
            {renderSocialLink('Twitter', data.socialLinks.twitter, Twitter)}
            {renderSocialLink('LinkedIn', data.socialLinks.linkedin, Linkedin)}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
