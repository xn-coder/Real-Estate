
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
import { Briefcase, Home, Users, Calendar, Loader2 } from "lucide-react"
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subMonths, startOfMonth } from "date-fns"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import type { Appointment } from "@/types/appointment"

type DetailedAppointment = Appointment & {
  lead?: Lead,
  property?: Property,
}

const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function Dashboard() {
  const [stats, setStats] = React.useState({
    activeLeads: 0,
    activeListings: 0,
    dealsInProgress: 0,
    upcomingAppointments: 0,
  });
  const [appointments, setAppointments] = React.useState<DetailedAppointment[]>([]);
  const [chartData, setChartData] = React.useState<{ month: string, leads: number }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Stats
        const leadsQuery = query(collection(db, "leads"), where("status", "not-in", ["Lost", "Completed"]));
        const listingsQuery = query(collection(db, "properties"), where("status", "==", "For Sale"));
        const dealsQuery = query(collection(db, "leads"), where("status", "in", ["Qualified", "Processing"]));
        const appointmentsQuery = query(collection(db, "appointments"), where("visitDate", ">=", Timestamp.now()), where("status", "==", "Scheduled"), orderBy("visitDate"));

        const [leadsSnap, listingsSnap, dealsSnap, appointmentsSnap] = await Promise.all([
          getDocs(leadsQuery),
          getDocs(listingsQuery),
          getDocs(dealsQuery),
          getDocs(appointmentsQuery),
        ]);

        const appointmentsListPromises = appointmentsSnap.docs.map(async (docData) => {
            const appt = { id: docData.id, ...docData.data() } as Appointment;
            const leadDoc = await getDoc(doc(db, "leads", appt.leadId));
            const propDoc = await getDoc(doc(db, "properties", appt.propertyId));
            return {
                ...appt,
                visitDate: (appt.visitDate as Timestamp).toDate(),
                lead: leadDoc.exists() ? leadDoc.data() as Lead : undefined,
                property: propDoc.exists() ? propDoc.data() as Property : undefined,
            }
        });

        const appointmentsList = await Promise.all(appointmentsListPromises);
        setAppointments(appointmentsList);
        
        setStats({
          activeLeads: leadsSnap.size,
          activeListings: listingsSnap.size,
          dealsInProgress: dealsSnap.size,
          upcomingAppointments: appointmentsSnap.size,
        });

        // Chart Data
        const leadsCollection = collection(db, "leads");
        const monthlyData: { [key: string]: number } = {};
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

        const leadsChartQuery = query(leadsCollection, where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo)));
        const leadsChartSnap = await getDocs(leadsChartQuery);

        leadsChartSnap.forEach(doc => {
            const lead = doc.data() as Lead;
            const monthKey = format((lead.createdAt as Timestamp).toDate(), 'MMM');
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        });

        const finalChartData = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(new Date(), 5 - i);
            const month = format(date, 'MMM');
            return { month, leads: monthlyData[month] || 0 };
        });

        setChartData(finalChartData);

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
            <div className="text-2xl font-bold">{value}</div>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderStatCard("Active Leads", stats.activeLeads, Users, "+2 from last month")}
        {renderStatCard("Active Listings", stats.activeListings, Home, "+5 this month")}
        {renderStatCard("Deals in Progress", stats.dealsInProgress, Briefcase, "+1 closed this week")}
        {renderStatCard("Upcoming Appointments", stats.upcomingAppointments, Calendar, `${appointments.filter(a => format(a.visitDate as Date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length} today`)}
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Lead Generation Overview</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
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
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              You have {stats.upcomingAppointments} upcoming appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <div className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.slice(0, 5).map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div className="font-medium">{appointment.lead?.name || 'N/A'}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{appointment.property?.catalogTitle || 'N/A'}</Badge></TableCell>
                            <TableCell>{format(appointment.visitDate as Date, "PPP")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
