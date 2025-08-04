
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
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"

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
  name: z.string().min(1, "Contact name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(1, "Pincode is required."),
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


export default function ManageWebsitePage() {
  const { toast } = useToast()
  const { user, isLoading, fetchUser } = useUser()
  
  const businessProfileForm = useForm<z.infer<typeof businessProfileSchema>>({
    resolver: zodResolver(businessProfileSchema),
  });
  const slideshowForm = useForm<z.infer<typeof slideshowSchema>>({
    resolver: zodResolver(slideshowSchema),
  });
  const contactDetailsForm = useForm<z.infer<typeof contactDetailsSchema>>({
    resolver: zodResolver(contactDetailsSchema),
  });
  const aboutLegalForm = useForm<z.infer<typeof aboutLegalSchema>>({
    resolver: zodResolver(aboutLegalSchema),
  });
  const socialLinksForm = useForm<z.infer<typeof socialLinksSchema>>({
    resolver: zodResolver(socialLinksSchema),
  });

  React.useEffect(() => {
    if (user) {
      businessProfileForm.reset({ businessName: user.name, businessLogo: user.businessLogo || '' })
      slideshowForm.reset({ title: user.website?.slideshow?.title || '', bannerImage: user.website?.slideshow?.bannerImage || '', linkUrl: user.website?.slideshow?.linkUrl || '' })
      contactDetailsForm.reset({ name: user.name, phone: user.phone, email: user.email, address: user.address || '', city: user.city || '', state: user.state || '', pincode: user.pincode || '' })
      aboutLegalForm.reset({ aboutText: user.website?.aboutLegal?.aboutText || '', termsLink: user.website?.aboutLegal?.termsLink || '', privacyLink: user.website?.aboutLegal?.privacyLink || '', disclaimerLink: user.website?.aboutLegal?.disclaimerLink || '' })
      socialLinksForm.reset(user.website?.socialLinks || { website: '', instagram: '', facebook: '', youtube: '', twitter: '', linkedin: '' })
    }
  }, [user, businessProfileForm, slideshowForm, contactDetailsForm, aboutLegalForm, socialLinksForm])

  const handleSave = async (section: string, values: any) => {
    if (!user) return
    const userDocRef = doc(db, "users", user.id)

    try {
      const dataToUpdate: any = {};
      
      if (section === 'businessProfile') {
          let logoUrl = values.businessLogo;
          if(logoUrl && typeof logoUrl !== 'string') {
              logoUrl = await fileToDataUrl(logoUrl);
          }
          dataToUpdate.name = values.businessName;
          dataToUpdate.businessLogo = logoUrl;
      } else {
          // Handle file uploads for other sections
          if (values.bannerImage && typeof values.bannerImage !== 'string') {
            values.bannerImage = await fileToDataUrl(values.bannerImage);
          }
          if (values.termsLink && typeof values.termsLink !== 'string') {
            values.termsLink = await fileToDataUrl(values.termsLink);
          }
          if (values.privacyLink && typeof values.privacyLink !== 'string') {
            values.privacyLink = await fileToDataUrl(values.privacyLink);
          }
          if (values.disclaimerLink && typeof values.disclaimerLink !== 'string') {
            values.disclaimerLink = await fileToDataUrl(values.disclaimerLink);
          }
          dataToUpdate[`website.${section}`] = values;
      }

      await updateDoc(userDocRef, dataToUpdate)

      await fetchUser() // Refresh user data
      toast({ title: "Success", description: `${section.replace(/([A-Z])/g, ' $1')} updated successfully.` })

    } catch (error) {
      console.error("Error updating user:", error)
      toast({ variant: "destructive", title: "Update Failed", description: "There was an error saving your changes." })
    }
  }

  const renderSocialLink = (label: string, url: string | undefined, Icon: React.ElementType) => (
    <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 truncate">{url || 'Not set'}</span>
    </div>
  )

  if (isLoading) {
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!user) {
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex items-center justify-center">
            <p>Could not load user data.</p>
        </div>
    )
  }


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
                    <a href={user.website?.socialLinks?.website} target="_blank" rel="noopener noreferrer">
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
                        <FormField control={businessProfileForm.control} name="businessLogo" render={({ field: { onChange, value, ...rest} }) => ( <FormItem><FormLabel>Business Logo</FormLabel>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20"><AvatarImage src={value} /><AvatarFallback>Logo</AvatarFallback></Avatar>
                            <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl>
                        </div>
                        <FormMessage /></FormItem> )} />
                        <DialogFooter><Button type="submit" disabled={businessProfileForm.formState.isSubmitting}>{businessProfileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
                </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-20 w-20"><AvatarImage src={user.businessLogo} /><AvatarFallback>Logo</AvatarFallback></Avatar>
            <p className="text-lg font-semibold">{user.name}</p>
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
                    <FormField control={slideshowForm.control} name="bannerImage" render={({ field: { onChange, value, ...rest} }) => ( <FormItem><FormLabel>Banner Image</FormLabel>
                        {typeof value === 'string' && value && <Image src={value} alt="Banner" width={400} height={100} className="w-full object-cover rounded-md" />}
                        <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={slideshowForm.control} name="linkUrl" render={({ field }) => ( <FormItem><FormLabel>Link URL</FormLabel><FormControl><Input placeholder="https://example.com/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={slideshowForm.formState.isSubmitting}>{slideshowForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Link href={user.website?.slideshow?.linkUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Image src={user.website?.slideshow?.bannerImage || 'https://placehold.co/1200x400.png'} alt="Banner" width={800} height={200} className="w-full object-cover rounded-md" />
            </Link>
             <p className="mt-2 text-center font-medium">{user.website?.slideshow?.title || 'No title set'}</p>
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
                    <FormField control={contactDetailsForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={contactDetailsForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={contactDetailsForm.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      <FormField control={contactDetailsForm.control} name="state" render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      <FormField control={contactDetailsForm.control} name="pincode" render={({ field }) => ( <FormItem> <FormLabel>Pincode</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </div>
                    <DialogFooter><Button type="submit" disabled={contactDetailsForm.formState.isSubmitting}>{contactDetailsForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Phone:</strong> {user.phone}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Address:</strong> {`${user.address}, ${user.city}, ${user.state} - ${user.pincode}`}</p>
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
                    <FormField control={aboutLegalForm.control} name="termsLink" render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Terms & Conditions (PDF)</FormLabel>
                        {typeof value === 'string' && value && <a href={value} className="text-primary underline text-sm block mb-2" target="_blank" rel="noopener noreferrer">View current file</a>}
                        <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={aboutLegalForm.control} name="privacyLink" render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Privacy Policy (PDF)</FormLabel>
                        {typeof value === 'string' && value && <a href={value} className="text-primary underline text-sm block mb-2" target="_blank" rel="noopener noreferrer">View current file</a>}
                        <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={aboutLegalForm.control} name="disclaimerLink" render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Disclaimer (PDF)</FormLabel>
                        {typeof value === 'string' && value && <a href={value} className="text-primary underline text-sm block mb-2" target="_blank" rel="noopener noreferrer">View current file</a>}
                        <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={aboutLegalForm.formState.isSubmitting}>{aboutLegalForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">About Us</h4>
              <p className="text-sm text-muted-foreground">{user.website?.aboutLegal?.aboutText || 'Not set'}</p>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Terms & Conditions: {user.website?.aboutLegal?.termsLink ? <a href={user.website.aboutLegal.termsLink} className="text-primary underline" target="_blank" rel="noopener noreferrer">View File</a> : 'Not set'}</span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Privacy Policy: {user.website?.aboutLegal?.privacyLink ? <a href={user.website.aboutLegal.privacyLink} className="text-primary underline" target="_blank" rel="noopener noreferrer">View File</a> : 'Not set'}</span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>Disclaimer: {user.website?.aboutLegal?.disclaimerLink ? <a href={user.website.aboutLegal.disclaimerLink} className="text-primary underline" target="_blank" rel="noopener noreferrer">View File</a> : 'Not set'}</span>
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
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            {renderSocialLink('Website', user.website?.socialLinks?.website, Globe)}
            {renderSocialLink('Instagram', user.website?.socialLinks?.instagram, Instagram)}
            {renderSocialLink('Facebook', user.website?.socialLinks?.facebook, Facebook)}
            {renderSocialLink('YouTube', user.website?.socialLinks?.youtube, Youtube)}
            {renderSocialLink('Twitter', user.website?.socialLinks?.twitter, Twitter)}
            {renderSocialLink('LinkedIn', user.website?.socialLinks?.linkedin, Linkedin)}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

