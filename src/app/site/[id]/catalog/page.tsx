
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import type { Property } from "@/types/property"
import { Loader2, Phone, Mail, MapPin, Globe, Instagram, Facebook, Youtube, Twitter, Linkedin, Building, Home, Contact, Newspaper, ArrowRight, Menu, X, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const ITEMS_PER_PAGE = 12;

const PartnerCatalogPage = () => {
    const params = useParams()
    const partnerId = params.id as string

    const [partner, setPartner] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [websiteData, setWebsiteData] = React.useState<User['website']>({});
    const [allProperties, setAllProperties] = React.useState<Property[]>([]);
    const [featuredProperties, setFeaturedProperties] = React.useState<Property[]>([]);
    const [categories, setCategories] = React.useState<string[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
    // Filtering and Pagination State
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
    const [currentPage, setCurrentPage] = React.useState(1);


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
                    featuredCatalog: partnerWebsiteData.featuredCatalog || defaults.featuredCatalog || [],
                };
                setWebsiteData(finalWebsiteData);
                
                const propsQuery = query(collection(db, "properties"), where("status", "==", "For Sale"));
                const propsSnapshot = await getDocs(propsQuery);
                const uniqueCategories = new Set<string>();
                const propsData = await Promise.all(propsSnapshot.docs.map(async (pDoc) => {
                    const data = pDoc.data() as Property;
                    if(data.propertyCategory) uniqueCategories.add(data.propertyCategory);
                    let featureImageUrl = 'https://placehold.co/600x400.png';
                    if (data.featureImageId) {
                        const fileDoc = await getDoc(doc(db, 'files', data.featureImageId));
                        if (fileDoc.exists()) {
                            featureImageUrl = fileDoc.data()?.data;
                        }
                    }
                    return { ...data, id: pDoc.id, featureImage: featureImageUrl };
                }));
                setAllProperties(propsData);
                setCategories(['All', ...Array.from(uniqueCategories)]);

                const featuredIds = finalWebsiteData.featuredCatalog.slice(0, 6);
                setFeaturedProperties(propsData.filter(p => featuredIds.includes(p.id)));

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

    const filteredProperties = React.useMemo(() => {
        return allProperties.filter(property => {
            const searchMatch = searchTerm === "" || 
                property.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.city.toLowerCase().includes(searchTerm.toLowerCase());
            
            const categoryMatch = selectedCategory === "All" || property.propertyCategory === selectedCategory;

            return searchMatch && categoryMatch;
        });
    }, [allProperties, searchTerm, selectedCategory]);

    const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
    const paginatedProperties = filteredProperties.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );


    const partnerName = websiteData?.businessProfile?.businessName || partner?.name || "Partner Name";
    const partnerLogo = websiteData?.businessProfile?.businessLogo || partner?.businessLogo || '';

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

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <section id="featured-catalog" className="py-8">
                    <h2 className="text-3xl font-bold font-headline text-center mb-8">Featured Properties</h2>
                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredProperties.length > 0 ? featuredProperties.map(property => (
                            <Link href={`/listings/${property.id}`} key={property.id} className="border rounded-lg overflow-hidden group block">
                                <div className="relative h-64 bg-muted"><Image src={property.featureImage || `https://placehold.co/600x400.png`} layout="fill" objectFit="cover" alt={property.catalogTitle} data-ai-hint="modern apartment"/></div>
                                <div className="p-6"><h3 className="text-xl font-bold mb-2">{property.catalogTitle}</h3><p className="text-muted-foreground mb-4">{property.bedrooms} beds, {property.bathrooms} baths</p></div>
                            </Link>
                        )) : (
                            <p className="col-span-full text-center text-muted-foreground">No featured properties available.</p>
                        )}
                     </div>
                </section>
                
                 <section id="full-catalog" className="py-12">
                    <h2 className="text-3xl font-bold font-headline text-center mb-8">All Properties</h2>
                    <div className="mb-8 space-y-4">
                         <div className="relative max-w-lg mx-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search by title or location..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                             {categories.map(category => (
                                <Button key={category} variant={selectedCategory === category ? "default" : "outline"} onClick={() => setSelectedCategory(category)}>
                                    {category}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {paginatedProperties.length > 0 ? paginatedProperties.map(property => (
                            <Link href={`/listings/${property.id}`} key={property.id} className="border rounded-lg overflow-hidden group block">
                                <div className="relative h-64 bg-muted"><Image src={property.featureImage || `https://placehold.co/600x400.png`} layout="fill" objectFit="cover" alt={property.catalogTitle} data-ai-hint="modern apartment"/></div>
                                <div className="p-6">
                                    <Badge variant="secondary" className="mb-2">{property.propertyCategory}</Badge>
                                    <h3 className="text-xl font-bold mb-2">{property.catalogTitle}</h3>
                                    <p className="text-muted-foreground mb-4">{property.bedrooms} beds, {property.bathrooms} baths</p>
                                    <p className="text-lg font-bold text-primary">₹{property.listingPrice.toLocaleString()}</p>
                                </div>
                            </Link>
                        )) : (
                            <p className="col-span-full text-center text-muted-foreground">No properties found matching your criteria.</p>
                        )}
                    </div>
                    
                    {totalPages > 1 && (
                         <div className="flex items-center justify-center space-x-2 mt-12">
                          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                              <ChevronLeft className="h-4 w-4" />
                          </Button>
                           <span className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                              <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default PartnerCatalogPage;
