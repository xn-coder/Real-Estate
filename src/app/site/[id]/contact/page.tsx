
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import { Loader2, Phone, Mail, MapPin, Instagram, Facebook, Youtube, Twitter, Linkedin, Menu, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "A valid phone number is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})
type ContactFormValues = z.infer<typeof contactFormSchema>;

const PartnerContactPage = () => {
    const params = useParams()
    const { toast } = useToast()
    const partnerId = params.id as string

    const [partner, setPartner] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [websiteData, setWebsiteData] = React.useState<User['website']>({});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: { name: "", email: "", phone: "", message: "" }
    });


    const fetchPartnerData = React.useCallback(async () => {
        if (!partnerId) return
        setIsLoading(true)
        try {
            const userDocRef = doc(db, "users", partnerId)
            const userDoc = await getDoc(userDocRef)
            
            if (userDoc.exists()) {
                const partnerData = { id: userDoc.id, ...userDoc.data() } as User;
                setPartner(partnerData);
                
                const websiteDefaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));
                const defaults = websiteDefaultsDoc.exists() ? websiteDefaultsDoc.data() : {};
                
                const partnerWebsiteData = partnerData.website || {};
                
                const finalWebsiteData = {
                    businessProfile: partnerWebsiteData.businessProfile || defaults.businessProfile,
                    contactDetails: partnerWebsiteData.contactDetails || defaults.contactDetails,
                    socialLinks: partnerWebsiteData.socialLinks || defaults.socialLinks,
                };
                setWebsiteData(finalWebsiteData);
            } else {
                setPartner(null)
            }
        } catch (error) {
            console.error("Error fetching partner data:", error)
        } finally {
            setIsLoading(false)
        }
    }, [partnerId])

    React.useEffect(() => {
        fetchPartnerData()
    }, [fetchPartnerData])

    const handleFormSubmit = async (values: ContactFormValues) => {
        try {
            await addDoc(collection(db, "inquiries"), {
                ...values,
                partnerId: partnerId,
                createdAt: Timestamp.now(),
                status: 'New'
            });
            toast({
                title: "Message Sent!",
                description: "We have received your message and will get back to you shortly.",
            });
            form.reset();
        } catch (error) {
            console.error("Error sending message:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send your message. Please try again later.",
            });
        }
    }

    const partnerName = websiteData?.businessProfile?.businessName || partner?.name || "Partner Name";
    const partnerLogo = websiteData?.businessProfile?.businessLogo || partner?.businessLogo || '';
    const contactDetails = websiteData?.contactDetails || partner;
    const socialLinks = websiteData?.socialLinks;

    const socialComponents = [
        { Icon: Instagram, href: socialLinks?.instagram },
        { Icon: Facebook, href: socialLinks?.facebook },
        { Icon: Twitter, href: socialLinks?.twitter },
        { Icon: Youtube, href: socialLinks?.youtube },
        { Icon: Linkedin, href: socialLinks?.linkedin },
    ].filter(s => s.href);


    if (isLoading) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )
    }
    
    if (!partner) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <p className="text-destructive">Partner website not found.</p>
            </div>
        )
    }

    const navLinks = [
        { label: 'Home', href: `/site/${partnerId}`},
        { label: 'Catalog', href: `/site/${partnerId}/catalog`},
        { label: 'Contact Us', href: `/site/${partnerId}/contact`},
    ];

    return (
        <div className="bg-background text-foreground font-body">
             <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href={`/site/${partnerId}`} className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={partnerLogo} alt={partnerName} />
                                <AvatarFallback>
                                    {partnerName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-lg font-headline">{partnerName}</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {navLinks.map(link => (
                                <Link key={link.label} href={link.href} className="hover:text-primary transition-colors">{link.label}</Link>
                            ))}
                        </nav>
                         <div className="md:hidden">
                             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="h-6 w-6"/>
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-full">
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-8">
                                            <span className="font-bold text-lg font-headline">{partnerName}</span>
                                            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                                                <X className="h-6 w-6"/>
                                                <span className="sr-only">Close menu</span>
                                            </Button>
                                        </div>
                                        <nav className="flex flex-col gap-4 text-lg">
                                             {navLinks.map(link => (
                                                <Link key={link.label} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-left hover:text-primary transition-colors">{link.label}</Link>
                                             ))}
                                        </nav>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline">Get In Touch</h1>
                    <p className="text-muted-foreground mt-2">We'd love to hear from you. Please fill out the form below.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left Side - Info */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold font-headline">Contact Information</h2>
                        <div className="space-y-4">
                             <div className="flex items-start gap-4">
                                <Mail className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold">Email</h3>
                                    <a href={`mailto:${contactDetails.email}`} className="text-muted-foreground hover:text-primary">{contactDetails.email}</a>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Phone className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold">Phone</h3>
                                    <a href={`tel:${contactDetails.phone}`} className="text-muted-foreground hover:text-primary">{contactDetails.phone}</a>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <MapPin className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold">Address</h3>
                                    <p className="text-muted-foreground">{`${contactDetails.address}, ${contactDetails.city}, ${contactDetails.state} - ${contactDetails.pincode}`}</p>
                                </div>
                            </div>
                        </div>
                        {socialComponents.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold font-headline mt-8 mb-4">Follow Us</h3>
                                <div className="flex gap-4">
                                    {socialComponents.map(({ Icon, href }, index) => (
                                        <a key={index} href={href || '#'} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                            <Icon className="h-6 w-6" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Form */}
                    <div>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-8 border rounded-lg bg-card">
                                 <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="message" render={({ field }) => ( <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={5} placeholder="How can we help you?" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Send Message
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default PartnerContactPage;
