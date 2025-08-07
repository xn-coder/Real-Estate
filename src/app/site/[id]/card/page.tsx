
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import { Loader2, Menu, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import DigitalCard from "@/components/digital-card"
import { Button } from "@/components/ui/button"


const PartnerWebsitePage = () => {
    const params = useParams()
    const partnerId = params.id as string

    const [partner, setPartner] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [websiteData, setWebsiteData] = React.useState<User['website']>({});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    

    const fetchPartner = React.useCallback(async () => {
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
                    contactDetails: partnerWebsiteData.contactDetails || partnerData,
                    aboutLegal: partnerWebsiteData.aboutLegal || defaults.aboutLegal,
                    socialLinks: partnerWebsiteData.socialLinks || defaults.socialLinks,
                };
                setWebsiteData(finalWebsiteData);

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

    const partnerName = websiteData?.businessProfile?.businessName || partner?.name || "Partner Name";
    const partnerLogo = websiteData?.businessProfile?.businessLogo || partner?.businessLogo || '';
    const aboutLegal = websiteData?.aboutLegal;


    const scrollTo = (id: string) => {
        // If on a different page, navigate first then scroll.
        // For this simple case we assume we are on the main site page
        window.location.href = `/site/${partnerId}#${id}`;
    }

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
            <p className="text-destructive">Partner not found.</p>
            </div>
        )
    }


    return (
        <div className="bg-background text-foreground font-body">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href={`/site/${partner.id}`} className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={partnerLogo} alt={partnerName} />
                                <AvatarFallback>
                                    {partnerName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-lg font-headline">{partnerName}</span>
                        </Link>
                         <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <button onClick={() => scrollTo('catalog')} className="hover:text-primary transition-colors">Catalog</button>
                            <Link href={`/site/${partner.id}/card`} className="hover:text-primary transition-colors">Digital Card</Link>
                            <button onClick={() => scrollTo('contact')} className="hover:text-primary transition-colors">Contact Us</button>
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
                                             <button onClick={() => { scrollTo('catalog'); setIsMobileMenuOpen(false); }} className="text-left hover:text-primary transition-colors">Catalog</button>
                                             <Link href={`/site/${partner.id}/card`} onClick={() => setIsMobileMenuOpen(false)} className="text-left hover:text-primary transition-colors">Digital Card</Link>
                                             <button onClick={() => { scrollTo('contact'); setIsMobileMenuOpen(false); }} className="text-left hover:text-primary transition-colors">Contact Us</button>
                                        </nav>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="py-12 md:py-20">
                <DigitalCard partner={partner} websiteData={websiteData} />
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
                        <div>
                            <h4 className="font-bold text-lg mb-2">{partnerName}</h4>
                            <p className="text-sm text-gray-400">
                                {aboutLegal?.aboutText?.substring(0, 100) || 'Your trusted real estate partner.'}...
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Quick Links</h4>
                             <ul className="space-y-1 text-sm">
                                <li><button onClick={() => scrollTo('catalog')} className="text-gray-400 hover:text-white">Catalog</button></li>
                                <li><Link href={`/site/${partner.id}/card`} className="text-gray-400 hover:text-white">Digital Card</Link></li>
                                <li><button onClick={() => scrollTo('contact')} className="text-gray-400 hover:text-white">Contact Us</button></li>
                            </ul>
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
