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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, Target, Users, DollarSign, Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import { format, subMonths, startOfMonth } from "date-fns"

const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const pieChartColors = ["#2563eb", "#f97316", "#16a34a", "#dc2626"];

export default function ReportsAnalyticsPage() {
  const { user } = useUser()
  const [isLoading, setIsLoading] = React.useState(true)

  const [stats, setStats] = React.useState({
    totalLeads: 0,
    dealsClosed: 0,
    conversionRate: 0,
    totalDealValue: 0,
  })

  const [leadsByMonth, setLeadsByMonth] = React.useState<{ month: string, leads: number }[]>([])
  const [leadStatusDistribution, setLeadStatusDistribution] = React.useState<{ name: string, value: number }[]>([])

  React.useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const leadsQuery = query(collection(db, "leads"), where("partnerId", "==", user.id));
        const leadsSnapshot = await getDocs(leadsQuery);
        const leads = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead));

        // Calculate Stats
        const totalLeads = leads.length;
        const dealsClosed = leads.filter(l => l.status === 'Completed').length;
        const conversionRate = totalLeads > 0 ? (dealsClosed / totalLeads) * 100 : 0;
        
        let totalDealValue = 0;
        const completedLeads = leads.filter(l => l.status === 'Completed');
        for(const lead of completedLeads) {
            if (lead.propertyId) {
                const propDoc = await getDoc(doc(db, "properties", lead.propertyId));
                if (propDoc.exists()) {
                    totalDealValue += (propDoc.data() as Property).listingPrice || 0;
                }
            }
        }
        
        setStats({
          totalLeads,
          dealsClosed,
          conversionRate,
          totalDealValue,
        });

        // Prepare chart data
        // Leads by Month (last 6 months)
        const monthlyData: { [key: string]: number } = {};
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        
        leads.forEach(lead => {
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

        // Lead Status Distribution
        const statusCounts: { [key: string]: number } = { 'New': 0, 'Qualified': 0, 'Completed': 0, 'Lost': 0 };
        leads.forEach(lead => {
            const status = ['New', 'Contacted'].includes(lead.status) ? 'New' : 
                           ['Processing', 'Under Contract', 'Pending'].includes(lead.status) ? 'Qualified' : lead.status;
            if (status in statusCounts) {
                statusCounts[status]++;
            }
        });
        setLeadStatusDistribution(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      } catch (error) {
        console.error("Error fetching analytics data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Reports & Analytics</h1>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats.totalLeads}</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deals Closed</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats.dealsClosed}</div>}
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deal Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">₹{stats.totalDealValue.toLocaleString()}</div>}
            </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Generation by Month</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="min-h-[250px] h-[300px] w-full">
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
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>An overview of your current sales funnel.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={leadStatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {leadStatusDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
              </ResponsiveContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
