
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import type { Property } from "@/types/property"
import { Loader2, Phone, Mail, MapPin, Globe, Instagram, Facebook, Youtube, Twitter, Linkedin, Building, Home, Contact, Newspaper, ArrowRight, Menu, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"


const PartnerWebsitePage = () => {
    const params = useParams()
    const partnerId = params.id as string

    const [partner, setPartner] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [websiteData, setWebsiteData] = React.useState<User['website']>({});
    const [featuredProperties, setFeaturedProperties] = React.useState<Property[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
    const plugin = React.useRef(
        Autoplay({ delay: 3000, stopOnInteraction: true })
    )

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
                    slideshow: partnerWebsiteData.slideshow || defaults.slideshow || [],
                    contactDetails: partnerWebsiteData.contactDetails || defaults.contactDetails,
                    aboutLegal: partnerWebsiteData.aboutLegal || defaults.aboutLegal,
                    socialLinks: partnerWebsiteData.socialLinks || defaults.socialLinks,
                    featuredCatalog: partnerWebsiteData.featuredCatalog || defaults.featuredCatalog || [],
                };
                
                // Filter slides for website
                finalWebsiteData.slideshow = finalWebsiteData.slideshow.filter((s: any) => s.showOnPartnerWebsite);

                setWebsiteData(finalWebsiteData);

                // Fetch featured properties
                const catalogIds = finalWebsiteData.featuredCatalog;
                if (catalogIds && catalogIds.length > 0) {
                    // Firestore 'in' queries are limited to 10 items. If more are needed, chunking is required.
                    const propertiesQuery = query(collection(db, "properties"), where("id", "in", catalogIds.slice(0, 10)));
                    const propertiesSnapshot = await getDocs(propertiesQuery);
                    const propsData = await Promise.all(propertiesSnapshot.docs.map(async (pDoc) => {
                        const data = pDoc.data() as Property;
                        let featureImageUrl = 'https://placehold.co/600x400.png';
                        if (data.featureImageId) {
                            const fileDoc = await getDoc(doc(db, 'files', data.featureImageId));
                            if (fileDoc.exists()) {
                                featureImageUrl = fileDoc.data()?.data;
                            }
                        }
                        return { ...data, id: pDoc.id, featureImage: featureImageUrl };
                    }));
                    setFeaturedProperties(propsData);
                }

            } else {
                console.error("No such partner!")
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

    const partnerName = websiteData?.businessProfile?.businessName || partner?.name || "Partner Name";
    const partnerLogo = websiteData?.businessProfile?.businessLogo || partner?.businessLogo || '';
    const contactDetails = websiteData?.contactDetails || partner;
    const socialLinks = websiteData?.socialLinks;
    const aboutLegal = websiteData?.aboutLegal;
    const slideshow = websiteData?.slideshow || [];

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

    const navLinks = [
        { label: 'Home', action: () => scrollTo('hero')},
        { label: 'Catalog', action: () => scrollTo('catalog')},
        { label: 'Contact Us', action: () => scrollTo('footer-contact')},
    ];

    return (
        <div className="bg-background text-foreground font-body">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button onClick={() => scrollTo('hero')} className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={partnerLogo} alt={partnerName} />
                                <AvatarFallback>
                                    {partnerName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-lg font-headline">{partnerName}</span>
                        </button>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {navLinks.map(link => (
                                <button key={link.label} onClick={link.action} className="hover:text-primary transition-colors">{link.label}</button>
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
                                                <button key={link.label} onClick={() => { link.action(); setIsMobileMenuOpen(false); }} className="text-left hover:text-primary transition-colors">{link.label}</button>
                                             ))}
                                        </nav>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {/* Hero Section */}
                 <section id="hero" className="relative bg-muted/40">
                    {slideshow.length > 0 ? (
                        <Carousel 
                            className="w-full" 
                            opts={{ loop: true }}
                            plugins={[plugin.current]}
                            onMouseEnter={plugin.current.stop}
                            onMouseLeave={plugin.current.reset}
                        >
                            <CarouselContent>
                                {slideshow.map((slide) => (
                                    <CarouselItem key={slide.id}>
                                         <a href={slide.linkUrl || '#'} target={slide.linkUrl ? '_blank' : '_self'} rel="noopener noreferrer" className="block w-full h-full">
                                            <div className="relative aspect-[16/9] md:aspect-[2.4/1] bg-gradient-to-t from-black/50 to-transparent">
                                                <Image 
                                                    src={slide.bannerImage || 'https://placehold.co/1920x800.png'} 
                                                    alt={slide.title || 'Banner Image'}
                                                    layout="fill"
                                                    objectFit="cover"
                                                    className="-z-10"
                                                    data-ai-hint="office building abstract"
                                                />
                                                <div className="absolute inset-0 flex items-end justify-center pb-8 md:pb-12">
                                                    <div className="text-center text-white px-4">
                                                        <h1 className="text-2xl md:text-4xl font-bold font-headline drop-shadow-lg">
                                                            {slide.title || 'Welcome to Our Website'}
                                                        </h1>
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:inline-flex" />
                            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex" />
                        </Carousel>
                    ) : (
                         <div className="relative aspect-[16/9] md:aspect-[2.4/1] bg-gradient-to-r from-gray-800 to-gray-900">
                            <Image 
                                src={'https://placehold.co/1920x800.png'} 
                                alt={'Default Banner Image'}
                                layout="fill"
                                objectFit="cover"
                                className="opacity-20"
                                data-ai-hint="office building abstract"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white px-4">
                                    <h1 className="text-4xl md:text-6xl font-extrabold font-headline drop-shadow-lg">
                                        Welcome to Our Website
                                    </h1>
                                </div>
                            </div>
                        </div>
                    )}
                </section>


                {/* Catalog Section */}
                <section id="catalog" className="py-12 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                         <h2 className="text-3xl font-bold font-headline text-center mb-12">Our Featured Catalog</h2>
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredProperties.length > 0 ? featuredProperties.map(property => (
                                <div key={property.id} className="border rounded-lg overflow-hidden group">
                                    <div className="relative h-64 bg-muted">
                                        <Image src={property.featureImage || `https://placehold.co/600x400.png`} layout="fill" objectFit="cover" alt={property.catalogTitle} data-ai-hint="modern apartment"/>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-2">{property.catalogTitle}</h3>
                                        <p className="text-muted-foreground mb-4">{property.bedrooms} beds, {property.bathrooms} baths, {property.builtUpArea} {property.unitOfMeasurement}</p>
                                        <Button variant="outline" className="w-full" asChild><Link href={`/listings/${property.id}`}>View Details</Link></Button>
                                    </div>
                                </div>
                            )) : (
                                <p className="col-span-full text-center text-muted-foreground">No featured properties available at the moment.</p>
                            )}
                         </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer id="footer-contact" className="bg-gray-800 text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
                        <div>
                            <h4 className="font-bold text-lg mb-2">{partnerName}</h4>
                             <div className="space-y-2 text-gray-400 text-sm">
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <Mail className="h-4 w-4" />
                                    <a href={`mailto:${contactDetails.email}`} className="hover:text-white">{contactDetails.email}</a>
                                </div>
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <Phone className="h-4 w-4" />
                                    <a href={`tel:${contactDetails.phone}`} className="hover:text-white">{contactDetails.phone}</a>
                                </div>
                                <div className="flex items-start gap-2 justify-center md:justify-start">
                                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                                    <p>{`${contactDetails.address}, ${contactDetails.city}, ${contactDetails.state} - ${contactDetails.pincode}`}</p>
                                </div>
                             </div>
                        </div>
                         <div>
                            <h4 className="font-bold text-lg mb-2">Follow Us</h4>
                            <div className="flex gap-4 justify-center md:justify-start">
                                {socialComponents.map(({ Icon, href }, index) => (
                                    <a key={index} href={href || '#'} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                                        <Icon className="h-6 w-6" />
                                    </a>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-bold text-lg mb-2">Legal</h4>
                             <ul className="space-y-1 text-sm">
                                {aboutLegal?.termsLink && <li><a href={aboutLegal.termsLink as string} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Terms & Conditions</a></li>}
                                {aboutLegal?.privacyLink && <li><a href={aboutLegal.privacyLink as string} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Privacy Policy</a></li>}
                                {aboutLegal?.disclaimerLink && <li><a href={aboutLegal.disclaimerLink as string} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Disclaimer</a></li>}
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
                        <p>&copy; {new Date().getFullYear()} {partnerName}. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default PartnerWebsitePage;
