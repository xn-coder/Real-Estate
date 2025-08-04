
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import { Loader2, Phone, Mail, MapPin, Globe, Instagram, Facebook, Youtube, Twitter, Linkedin, Building, Home, Contact, Newspaper } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const PartnerWebsitePage = () => {
    const params = useParams()
    const partnerId = params.id as string

    const [partner, setPartner] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchPartner = React.useCallback(async () => {
        if (!partnerId) return
        setIsLoading(true)
        try {
            const userDocRef = doc(db, "users", partnerId)
            const userDoc = await getDoc(userDocRef)
            if (userDoc.exists()) {
                setPartner({ id: userDoc.id, ...userDoc.data() } as User)
            } else {
                console.error("No such partner!")
                setPartner(null)
            }
        } catch (error) {
            console.error("Error fetching partner:", error)
        } finally {
            setIsLoading(false)
        }
    }, [partnerId])

    React.useEffect(() => {
        fetchPartner()
    }, [fetchPartner])

    const socialLinks = partner?.website?.socialLinks;
    const aboutLegal = partner?.website?.aboutLegal;
    const slideshow = partner?.website?.slideshow;

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

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="bg-background text-foreground font-body">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={partner.businessLogo} alt={partner.name} />
                                <AvatarFallback>
                                    {partner.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-lg font-headline">{partner.name}</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <button onClick={() => scrollTo('catalog')} className="hover:text-primary transition-colors">Catalog</button>
                            <Link href={`/card/${partner.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Digital Card</Link>
                            <button onClick={() => scrollTo('contact')} className="hover:text-primary transition-colors">Contact Us</button>
                        </nav>
                        <div className="md:hidden">
                            {/* Mobile menu can be added here */}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {/* Hero Section */}
                <section className="relative h-96">
                    <Image 
                        src={slideshow?.bannerImage || 'https://placehold.co/1920x1080.png'} 
                        alt={slideshow?.title || 'Banner Image'}
                        layout="fill"
                        objectFit="cover"
                        className="brightness-50"
                        data-ai-hint="office building"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <a href={slideshow?.linkUrl} target="_blank" rel="noopener noreferrer" className="text-center text-white">
                            <h1 className="text-4xl md:text-6xl font-extrabold font-headline drop-shadow-lg">
                                {slideshow?.title || 'Welcome to Our Website'}
                            </h1>
                        </a>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="py-12 md:py-20 bg-muted/50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-3xl mx-auto text-center">
                            <h2 className="text-3xl font-bold font-headline mb-4">About Us</h2>
                            <p className="text-muted-foreground">
                                {aboutLegal?.aboutText || 'Information about the business will be displayed here.'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Catalog Section */}
                <section id="catalog" className="py-12 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                         <h2 className="text-3xl font-bold font-headline text-center mb-12">Our Catalog</h2>
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1,2,3].map(i => (
                                <div key={i} className="border rounded-lg overflow-hidden group">
                                    <div className="relative h-64 bg-muted">
                                        <Image src={`https://placehold.co/600x400.png`} layout="fill" objectFit="cover" alt={`Property ${i}`} data-ai-hint="modern apartment"/>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-2">Modern Apartment {i}</h3>
                                        <p className="text-muted-foreground mb-4">3 beds, 2 baths, 1,200 sqft</p>
                                        <Button variant="outline" className="w-full">View Details</Button>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </section>

                {/* Enquiry Form Section */}
                <section id="enquiry" className="py-12 md:py-20 bg-muted/50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold font-headline text-center mb-12">Enquire Now</h2>
                        <div className="max-w-xl mx-auto">
                            <form className="space-y-4">
                                <Input placeholder="Your Name" />
                                <Input type="email" placeholder="Your Email" />
                                <Input type="tel" placeholder="Your Phone Number" />
                                <Textarea placeholder="Your Message" />
                                <Button className="w-full">Submit Enquiry</Button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="py-12 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold font-headline text-center mb-12">Get In Touch</h2>
                        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <Mail className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <h4 className="font-semibold">Email</h4>
                                        <a href={`mailto:${partner.email}`} className="text-muted-foreground hover:text-primary">{partner.email}</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Phone className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <h4 className="font-semibold">Phone</h4>
                                        <a href={`tel:${partner.phone}`} className="text-muted-foreground hover:text-primary">{partner.phone}</a>
                                    </div>
                                </div>
                                 <div className="flex items-start gap-4">
                                    <MapPin className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <h4 className="font-semibold">Address</h4>
                                        <p className="text-muted-foreground">{`${partner.address}, ${partner.city}, ${partner.state} - ${partner.pincode}`}</p>
                                    </div>
                                </div>
                            </div>
                             <div className="space-y-6">
                                <h4 className="font-semibold">Follow Us</h4>
                                <div className="flex gap-4">
                                    {socialComponents.map(({ Icon, href }, index) => (
                                        <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                            <Icon className="h-6 w-6" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
                        <div>
                            <h4 className="font-bold text-lg mb-2">{partner.name}</h4>
                            <p className="text-sm text-gray-400">
                                {aboutLegal?.aboutText?.substring(0, 100) || 'Your trusted real estate partner.'}...
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Quick Links</h4>
                             <ul className="space-y-1 text-sm">
                                <li><button onClick={() => scrollTo('catalog')} className="text-gray-400 hover:text-white">Catalog</button></li>
                                <li><a href={`/card/${partner.id}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Digital Card</a></li>
                                <li><button onClick={() => scrollTo('contact')} className="text-gray-400 hover:text-white">Contact Us</button></li>
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-bold text-lg mb-2">Legal</h4>
                             <ul className="space-y-1 text-sm">
                                {aboutLegal?.termsLink && <li><a href={aboutLegal.termsLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Terms</a></li>}
                                {aboutLegal?.privacyLink && <li><a href={aboutLegal.privacyLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Privacy</a></li>}
                                {aboutLegal?.disclaimerLink && <li><a href={aboutLegal.disclaimerLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Disclaimer</a></li>}
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
                        <p>&copy; {new Date().getFullYear()} {partner.name}. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default PartnerWebsitePage;
