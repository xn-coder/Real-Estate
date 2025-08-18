
'use client'

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Home, Users, Loader2, Handshake, UserPlus } from "lucide-react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subMonths, startOfMonth } from "date-fns"
import type { Lead } from "@/types/lead"
import type { User } from '@/types/user';

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

const chartConfig = {
  leads: { label: "Leads", color: "hsl(var(--chart-1))" },
  partners: { label: "Partners", color: "hsl(var(--chart-2))" },
  customers: { label: "Customers", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export default function Dashboard() {
  const [stats, setStats] = React.useState({
    totalProperties: 0,
    newLeads: 0,
    totalPartners: 0,
    totalCustomers: 0,
  });
  const [leadsChartData, setLeadsChartData] = React.useState<{ month: string, leads: number }[]>([]);
  const [partnersChartData, setPartnersChartData] = React.useState<{ month: string, partners: number }[]>([]);
  const [customersChartData, setCustomersChartData] = React.useState<{ month: string, customers: number }[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Stats
        const propertiesQuery = query(collection(db, "properties"));
        const newLeadsQuery = query(collection(db, "leads"), where("status", "==", "New"));
        const partnersQuery = query(collection(db, "users"), where("role", "in", partnerRoles));
        const customersQuery = query(collection(db, "users"), where("role", "==", "customer"));

        const [propertiesSnap, newLeadsSnap, partnersSnap, customersSnap] = await Promise.all([
          getDocs(propertiesQuery),
          getDocs(newLeadsQuery),
          getDocs(partnersQuery),
          getDocs(customersQuery),
        ]);
        
        setStats({
          totalProperties: propertiesSnap.size,
          newLeads: newLeadsSnap.size,
          totalPartners: partnersSnap.size,
          totalCustomers: customersSnap.size,
        });

        // Chart Data
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        const timestampSixMonthsAgo = Timestamp.fromDate(sixMonthsAgo);

        // Leads Chart Data
        const leadsCollection = collection(db, "leads");
        const leadsChartQuery = query(leadsCollection, where("createdAt", ">=", timestampSixMonthsAgo));
        const leadsChartSnap = await getDocs(leadsChartQuery);
        const leadsMonthly: { [key: string]: number } = {};
        leadsChartSnap.forEach(doc => {
            const lead = doc.data() as Lead;
            const monthKey = format((lead.createdAt as Timestamp).toDate(), 'MMM');
            leadsMonthly[monthKey] = (leadsMonthly[monthKey] || 0) + 1;
        });

        // Partners Chart Data
        const partnersChartQuery = query(collection(db, "users"), where("role", "in", partnerRoles), where("createdAt", ">=", timestampSixMonthsAgo));
        const partnersChartSnap = await getDocs(partnersChartQuery);
        const partnersMonthly: { [key: string]: number } = {};
        partnersChartSnap.forEach(doc => {
            const partner = doc.data() as User;
            if (partner.createdAt) {
                const monthKey = format((partner.createdAt as Timestamp).toDate(), 'MMM');
                partnersMonthly[monthKey] = (partnersMonthly[monthKey] || 0) + 1;
            }
        });

        // Customers Chart Data
        const customersChartQuery = query(collection(db, "users"), where("role", "==", "customer"), where("createdAt", ">=", timestampSixMonthsAgo));
        const customersChartSnap = await getDocs(customersChartQuery);
        const customersMonthly: { [key: string]: number } = {};
        customersChartSnap.forEach(doc => {
            const customer = doc.data() as User;
             if (customer.createdAt) {
                const monthKey = format((customer.createdAt as Timestamp).toDate(), 'MMM');
                customersMonthly[monthKey] = (customersMonthly[monthKey] || 0) + 1;
             }
        });

        const finalLeadsData = [];
        const finalPartnersData = [];
        const finalCustomersData = [];

        for (let i = 0; i < 6; i++) {
            const date = subMonths(new Date(), 5 - i);
            const month = format(date, 'MMM');
            finalLeadsData.push({ month, leads: leadsMonthly[month] || 0 });
            finalPartnersData.push({ month, partners: partnersMonthly[month] || 0 });
            finalCustomersData.push({ month, customers: customersMonthly[month] || 0 });
        }
        
        setLeadsChartData(finalLeadsData);
        setPartnersChartData(finalPartnersData);
        setCustomersChartData(finalCustomersData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);


  const renderStatCard = (title: string, value: number, icon: React.ElementType, description: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {React.createElement(icon, { className: "h-4 w-4 text-muted-foreground" })}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderStatCard("Total Properties", stats.totalProperties, Home, "All listed properties")}
        {renderStatCard("New Leads", stats.newLeads, UserPlus, "Fresh inquiries this month")}
        {renderStatCard("Total Partners", stats.totalPartners, Handshake, "All active partners")}
        {renderStatCard("Total Customers", stats.totalCustomers, Users, "All registered customers")}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
         <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Lead Generation</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="min-h-[250px] h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="leads" fill="var(--color-leads)" radius={8} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Partner Signups</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="min-h-[250px] h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={partnersChartData} margin={{ left: 12, right: 12 }}>
                     <defs>
                      <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-partners)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-partners)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Area dataKey="partners" type="monotone" fill="url(#colorPartners)" stroke="var(--color-partners)" stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
             )}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Customer Signups</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="min-h-[250px] h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customersChartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Line dataKey="customers" type="monotone" stroke="var(--color-customers)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
