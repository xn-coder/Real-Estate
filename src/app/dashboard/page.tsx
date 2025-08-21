
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, TooltipProps } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Building, UserPlus, Target, Handshake, ArrowRight, Home, Star } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, orderBy, limit, doc, getDoc } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import type { Property } from "@/types/property"
import type { PropertyType } from "@/types/resource"
import Link from "next/link"
import Image from "next/image"
import { format, subMonths, startOfMonth } from "date-fns"
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

type SellerStats = {
    totalLeads: number;
    newLeads: number;
    propertiesSold: number;
    totalRevenue: number;
}

type PartnerStats = {
    totalLeads: number;
    totalCustomers: number;
    totalDealValue: number;
    rewardPoints: number;
}

type AdminStats = {
    totalProperties: number;
    totalPartners: number;
    totalCustomers: number;
    totalLeads: number;
}

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
  customers: {
    label: "Customers",
    color: "hsl(var(--accent))",
  },
  partners: {
    label: "Partners",
    color: "hsl(var(--secondary-foreground))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Month
            </span>
            <span className="font-bold text-muted-foreground">{label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {payload[0].name}
            </span>
            <span className="font-bold">{payload[0].value}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

type PartnerDashboardData = {
    stats: PartnerStats;
    slideshow: any[];
    featuredProperties: Property[];
    recommendedProperties: Property[];
    propertyTypes: PropertyType[];
}

export default function DashboardPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const [stats, setStats] = React.useState<SellerStats | AdminStats | PartnerStats | null>(null);
    const [recentLeads, setRecentLeads] = React.useState<Lead[]>([]);
    const [monthlyChartData, setMonthlyChartData] = React.useState<{ month: string, leads: number, customers: number, partners: number }[]>([])
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);
    const [partnerDashboardData, setPartnerDashboardData] = React.useState<PartnerDashboardData | null>(null);
    const autoplay = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));


    const fetchSellerData = React.useCallback(async () => {
        if (!user || user.role !== 'seller') return;
        setIsLoadingStats(true);
        try {
            const propertiesQuery = query(collection(db, "properties"), where("email", "==", user.email));
            const propertiesSnapshot = await getDocs(propertiesQuery);
            const propertyIds = propertiesSnapshot.docs.map(doc => doc.id);

            if (propertyIds.length === 0) {
                setStats({ totalLeads: 0, newLeads: 0, propertiesSold: 0, totalRevenue: 0 });
                setRecentLeads([]);
                setIsLoadingStats(false);
                return;
            }

            const leadsQuery = query(collection(db, "leads"), where("propertyId", "in", propertyIds));
            const leadsSnapshot = await getDocs(leadsQuery);
            const leads = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead));

            const totalLeads = leads.length;
            const newLeads = leads.filter(l => l.status === 'New lead').length;
            const closedLeads = leads.filter(l => l.status === 'Completed' || l.status === 'Deal closed');
            const propertiesSold = new Set(closedLeads.map(l => l.propertyId)).size;
            const totalRevenue = closedLeads.reduce((acc, lead) => acc + (lead.closingAmount || 0), 0);

            setStats({ totalLeads, newLeads, propertiesSold, totalRevenue });

            const sortedLeads = leads.sort((a,b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
            setRecentLeads(sortedLeads.slice(0, 5));

        } catch (error) {
            console.error("Error fetching seller dashboard data:", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, [user]);

    const fetchPartnerData = React.useCallback(async () => {
        if (!user || !partnerRoles.includes(user.role)) return;
        setIsLoadingStats(true);
        try {
            // Stats
            const leadsQuery = query(collection(db, "leads"), where("partnerId", "==", user.id));
            const leadsSnapshot = await getDocs(leadsQuery);
            const leads = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead));
            const totalLeads = leads.length;
            const totalCustomers = new Set(leads.map(lead => lead.customerId)).size;
            const completedLeads = leads.filter(l => l.status === 'Completed' || l.status === 'Deal closed');
            const totalDealValue = completedLeads.reduce((acc, lead) => acc + (lead.closingAmount || 0), 0);
            const walletDoc = await getDoc(doc(db, "wallets", user.id));
            const rewardPoints = walletDoc.exists() ? walletDoc.data().rewardBalance || 0 : 0;
            const partnerStats = { totalLeads, totalCustomers, totalDealValue, rewardPoints };
            
            // Website Defaults
            const defaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));
            const defaults = defaultsDoc.exists() ? defaultsDoc.data() : {};
            const slideshow = (defaults.slideshow || []).filter((s: any) => s.showOnPartnerDashboard);
            const featuredIds = defaults.partnerFeaturedCatalog || [];
            const recommendedIds = defaults.recommendedCatalog || [];

            // Properties
            const allPropsQuery = query(collection(db, "properties"), where("status", "==", "For Sale"));
            const allPropsSnapshot = await getDocs(allPropsQuery);
            const allProps = allPropsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Property));
            const featuredProperties = allProps.filter(p => featuredIds.includes(p.id));
            const recommendedProperties = allProps.filter(p => recommendedIds.includes(p.id));

            // Property Types
            const typesSnapshot = await getDocs(collection(db, "property_types"));
            const propertyTypes = typesSnapshot.docs.map(d => ({id: d.id, ...d.data() } as PropertyType));

            setPartnerDashboardData({
                stats: partnerStats,
                slideshow,
                featuredProperties,
                recommendedProperties,
                propertyTypes
            })

        } catch (error) {
            console.error("Error fetching partner dashboard data:", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, [user]);


    const fetchAdminData = React.useCallback(async () => {
         if (!user || user.role !== 'admin') return;
        setIsLoadingStats(true);
        try {
            const propertiesSnapshot = await getDocs(collection(db, "properties"));
            const usersSnapshot = await getDocs(collection(db, "users"));
            const leadsSnapshot = await getDocs(collection(db, "leads"));
            
            const allUsers = usersSnapshot.docs.map(doc => doc.data() as User);
            
            const totalProperties = propertiesSnapshot.size;
            const totalPartners = allUsers.filter(u => partnerRoles.includes(u.role)).length;
            const totalCustomers = allUsers.filter(u => u.role === 'customer').length;
            const totalLeads = leadsSnapshot.size;
            
            setStats({ totalProperties, totalPartners, totalLeads, totalCustomers });

            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
            const monthlyData: { [key: string]: { leads: number, customers: number, partners: number } } = {};

            for (let i = 0; i < 6; i++) {
                const monthKey = format(subMonths(new Date(), 5 - i), 'MMM');
                monthlyData[monthKey] = { leads: 0, customers: 0, partners: 0 };
            }

            leadsSnapshot.docs.forEach(doc => {
                const lead = doc.data() as Lead;
                const createdAt = (lead.createdAt as Timestamp).toDate();
                if (createdAt >= sixMonthsAgo) {
                    const monthKey = format(createdAt, 'MMM');
                    if (monthlyData[monthKey]) monthlyData[monthKey].leads++;
                }
            });
            
            allUsers.forEach(u => {
                if (u.createdAt) {
                    const createdAt = (u.createdAt as Timestamp).toDate();
                    if (createdAt >= sixMonthsAgo) {
                         const monthKey = format(createdAt, 'MMM');
                         if(monthlyData[monthKey]) {
                             if(u.role === 'customer') monthlyData[monthKey].customers++;
                             if(partnerRoles.includes(u.role)) monthlyData[monthKey].partners++;
                         }
                    }
                }
            });

            const finalChartData = Object.entries(monthlyData).map(([month, data]) => ({
                month,
                ...data
            }));
            
            setMonthlyChartData(finalChartData);

        } catch (error) {
            console.error("Error fetching admin dashboard data:", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, [user]);

    React.useEffect(() => {
        if (user) {
            if (user.role === 'seller') {
                fetchSellerData();
            } else if (user.role === 'admin') {
                fetchAdminData();
            } else if (partnerRoles.includes(user.role)) {
                fetchPartnerData();
            } else {
                 setIsLoadingStats(false);
            }
        }
    }, [user, fetchSellerData, fetchAdminData, fetchPartnerData]);


    if (isUserLoading) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    if (user && partnerRoles.includes(user.role)) {
        if(isLoadingStats || !partnerDashboardData) {
            return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        }
        const partnerStats = partnerDashboardData.stats;
        const partnerCards = [
            { title: "Total Leads", icon: UserPlus, value: partnerStats?.totalLeads, href: "/leads" },
            { title: "Total Customers", icon: Users, value: partnerStats?.totalCustomers, href: "/manage-customer" },
            { title: "Total Deal Value", icon: Handshake, value: `₹${partnerStats?.totalDealValue?.toLocaleString() || 0}`, href: "/booking-management" },
            { title: "Reward Points", icon: Star, value: partnerStats?.rewardPoints?.toLocaleString() || 0, href: "/wallet" },
        ];
        return (
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                 {partnerDashboardData.slideshow.length > 0 && (
                    <Carousel className="w-full" plugins={[autoplay.current]} onMouseEnter={autoplay.current.stop} onMouseLeave={autoplay.current.reset}>
                        <CarouselContent>
                            {partnerDashboardData.slideshow.map((slide, index) => (
                                <CarouselItem key={index}>
                                    <a href={slide.linkUrl || '#'} target={slide.linkUrl ? '_blank' : '_self'}>
                                        <div className="aspect-[16/6] relative rounded-lg overflow-hidden">
                                            <Image src={slide.bannerImage} alt={slide.title} layout="fill" objectFit="cover" />
                                        </div>
                                    </a>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {partnerCards.map(item => (
                        <Card key={item.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{item.value}</div>
                                <Link href={item.href} className="text-xs text-muted-foreground flex items-center hover:underline">
                                    View All <ArrowRight className="h-3 w-3 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>
                     ))}
                </div>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-4 font-headline">Featured Properties</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {partnerDashboardData.featuredProperties.map(prop => (
                                <Link href={`/listings/${prop.id}`} key={prop.id} className="block group">
                                <Card className="overflow-hidden">
                                    <div className="aspect-video relative overflow-hidden"><Image src={prop.featureImage} alt={prop.catalogTitle} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform duration-300"/></div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{prop.catalogTitle}</h3>
                                        <p className="text-sm text-muted-foreground">{prop.city}</p>
                                    </CardContent>
                                </Card>
                                </Link>
                            ))}
                         </div>
                    </div>
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-4 font-headline">Recommended Properties</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {partnerDashboardData.recommendedProperties.map(prop => (
                                <Link href={`/listings/${prop.id}`} key={prop.id} className="block group">
                                <Card className="overflow-hidden">
                                    <div className="aspect-video relative overflow-hidden"><Image src={prop.featureImage} alt={prop.catalogTitle} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform duration-300"/></div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{prop.catalogTitle}</h3>
                                        <p className="text-sm text-muted-foreground">{prop.city}</p>
                                    </CardContent>
                                </Card>
                                </Link>
                            ))}
                         </div>
                    </div>
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-4 font-headline">Browse by Type</h2>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                           {partnerDashboardData.propertyTypes.map(type => (
                                <Link href={`/listings/list?type=${type.id}`} key={type.id} className="block group">
                                    <Card className="text-center p-4 hover:shadow-lg transition-shadow">
                                         <Image src={type.featureImage || 'https://placehold.co/100x100.png'} alt={type.name} width={60} height={60} className="mx-auto rounded-full aspect-square object-cover" />
                                        <h3 className="font-semibold mt-2 text-sm">{type.name}</h3>
                                    </Card>
                                </Link>
                           ))}
                         </div>
                    </div>
                </div>
            </div>
        )
    }

    if (user?.role === 'seller') {
        const sellerStats = stats as SellerStats;
         return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Seller Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader><CardTitle>Total Leads</CardTitle></CardHeader><CardContent>{isLoadingStats ? <Loader2 className="animate-spin"/> : sellerStats?.totalLeads}</CardContent></Card>
                    <Card><CardHeader><CardTitle>New Leads</CardTitle></CardHeader><CardContent>{isLoadingStats ? <Loader2 className="animate-spin"/> : sellerStats?.newLeads}</CardContent></Card>
                    <Card><CardHeader><CardTitle>Properties Sold</CardTitle></CardHeader><CardContent>{isLoadingStats ? <Loader2 className="animate-spin"/> : sellerStats?.propertiesSold}</CardContent></Card>
                    <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent>₹{isLoadingStats ? <Loader2 className="animate-spin"/> : sellerStats?.totalRevenue.toLocaleString()}</CardContent></Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow><TableHead>Customer</TableHead><TableHead>Property ID</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStats ? <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow> : recentLeads.map(lead => (
                                    <TableRow key={lead.id}>
                                        <TableCell>{lead.name}</TableCell>
                                        <TableCell>{lead.propertyId}</TableCell>
                                        <TableCell><Badge>{lead.status}</Badge></TableCell>
                                        <TableCell>{format((lead.createdAt as Timestamp).toDate(), 'PPP')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
     if (user?.role === 'admin') {
        const adminStats = stats as AdminStats;
        const adminCards = [
            { title: "Total Properties", icon: Building, value: adminStats?.totalProperties, href: "/listings" },
            { title: "Total Partners", icon: Handshake, value: adminStats?.totalPartners, href: "/manage-partner" },
            { title: "Total Customers", icon: Users, value: adminStats?.totalCustomers, href: "/manage-customer" },
            { title: "Total Leads", icon: UserPlus, value: adminStats?.totalLeads, href: "/leads" },
        ];

         return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {adminCards.map(item => (
                        <Card key={item.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{isLoadingStats ? <Loader2 className="animate-spin h-6 w-6" /> : item.value}</div>
                                <Link href={item.href} className="text-xs text-muted-foreground flex items-center hover:underline">
                                    View All <ArrowRight className="h-3 w-3 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>
                     ))}
                </div>
                 <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Leads Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                             {isLoadingStats ? <div className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={monthlyChartData}>
                                        <defs>
                                            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
                                        <ChartTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="leads" name="Leads" fill="url(#colorLeads)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Monthly Customers Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                             {isLoadingStats ? <div className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={monthlyChartData}>
                                         <defs>
                                            <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-customers)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--color-customers)" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
                                        <ChartTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="customers" name="Customers" fill="url(#colorCustomers)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Monthly Partners Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                             {isLoadingStats ? <div className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={monthlyChartData}>
                                         <defs>
                                            <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-partners)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--color-partners)" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
                                        <ChartTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="partners" name="Partners" fill="url(#colorPartners)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                 </div>
            </div>
        )
    }

    // Fallback for other roles or loading state
    return (
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard.</p>
      </div>
    );
}
