
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Building, UserPlus, Target, Handshake, ArrowRight } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import type { Property } from "@/types/property"
import Link from "next/link"
import { format, subMonths, startOfMonth } from "date-fns"

type SellerStats = {
    totalLeads: number;
    newLeads: number;
    propertiesSold: number;
    totalRevenue: number;
}

type AdminStats = {
    totalProperties: number;
    totalPartners: number;
    closedDeals: number;
}

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function DashboardPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const [stats, setStats] = React.useState<SellerStats | AdminStats | null>(null);
    const [recentLeads, setRecentLeads] = React.useState<Lead[]>([]);
    const [leadsByMonth, setLeadsByMonth] = React.useState<{ month: string, leads: number }[]>([])
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);

    const fetchSellerData = React.useCallback(async () => {
        if (!user || user.role !== 'seller') return;
        setIsLoadingStats(true);
        try {
            // 1. Find properties by seller email
            const propertiesQuery = query(collection(db, "properties"), where("email", "==", user.email));
            const propertiesSnapshot = await getDocs(propertiesQuery);
            const propertyIds = propertiesSnapshot.docs.map(doc => doc.id);

            if (propertyIds.length === 0) {
                setStats({ totalLeads: 0, newLeads: 0, propertiesSold: 0, totalRevenue: 0 });
                setRecentLeads([]);
                setIsLoadingStats(false);
                return;
            }

            // 2. Fetch leads for those properties
            const leadsQuery = query(collection(db, "leads"), where("propertyId", "in", propertyIds));
            const leadsSnapshot = await getDocs(leadsQuery);
            const leads = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead));

            // 3. Calculate stats
            const totalLeads = leads.length;
            const newLeads = leads.filter(l => l.status === 'New lead').length;
            const closedLeads = leads.filter(l => l.status === 'Completed' || l.status === 'Deal closed');
            const propertiesSold = new Set(closedLeads.map(l => l.propertyId)).size;
            const totalRevenue = closedLeads.reduce((acc, lead) => acc + (lead.closingAmount || 0), 0);

            setStats({ totalLeads, newLeads, propertiesSold, totalRevenue });

            // 4. Get recent leads
            const sortedLeads = leads.sort((a,b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
            setRecentLeads(sortedLeads.slice(0, 5));

        } catch (error) {
            console.error("Error fetching seller dashboard data:", error);
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
            
            const totalProperties = propertiesSnapshot.size;
            const totalPartners = usersSnapshot.docs.filter(doc => partnerRoles.includes(doc.data().role)).length;
            const closedDeals = leadsSnapshot.docs.filter(doc => doc.data().status === 'Completed' || doc.data().status === 'Deal closed').length;
            
            setStats({ totalProperties, totalPartners, closedDeals });

            // Prepare chart data (Leads by Month - last 6 months)
            const monthlyData: { [key: string]: number } = {};
            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
            
            leadsSnapshot.docs.forEach(doc => {
                const lead = doc.data() as Lead;
                const createdAt = (lead.createdAt as Timestamp).toDate();
                if (createdAt >= sixMonthsAgo) {
                    const monthKey = format(createdAt, 'MMM');
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                }
            });
            
            const finalChartData = Array.from({ length: 6 }, (_, i) => {
                const date = subMonths(new Date(), 5 - i);
                const month = format(date, 'MMM');
                return { month, leads: monthlyData[month] || 0 };
            });
            setLeadsByMonth(finalChartData);

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
            } else {
                 setIsLoadingStats(false);
            }
        }
    }, [user, fetchSellerData, fetchAdminData]);


    if (isUserLoading) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
            { title: "Closed Deals", icon: Target, value: adminStats?.closedDeals, href: "/deals" },
        ];

         return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                 <Card>
                    <CardHeader>
                        <CardTitle>Lead Generation by Month</CardTitle>
                        <CardDescription>A snapshot of the latest leads across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {isLoadingStats ? <div className="h-[350px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                            <ChartContainer config={chartConfig} className="min-h-[250px] h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leadsByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="leads" fill="var(--color-leads)" radius={4} />
                                </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
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
