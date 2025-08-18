
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
import { Briefcase, Home, Users, Calendar, Loader2, Handshake, UserPlus } from "lucide-react"
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subMonths, startOfMonth } from "date-fns"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import type { Appointment } from "@/types/appointment"
import type { User } from '@/types/user';

type DetailedAppointment = Appointment & {
  lead?: Lead,
  property?: Property,
}

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
  const [appointments, setAppointments] = React.useState<DetailedAppointment[]>([]);
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
        const appointmentsQuery = query(collection(db, "appointments"), where("visitDate", ">=", Timestamp.now()), where("status", "==", "Scheduled"), orderBy("visitDate"), limit(5));

        const [propertiesSnap, newLeadsSnap, partnersSnap, customersSnap, appointmentsSnap] = await Promise.all([
          getDocs(propertiesQuery),
          getDocs(newLeadsQuery),
          getDocs(partnersQuery),
          getDocs(customersQuery),
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
            const monthKey = format((partner.createdAt as Timestamp).toDate(), 'MMM');
            partnersMonthly[monthKey] = (partnersMonthly[monthKey] || 0) + 1;
        });

        // Customers Chart Data
        const customersChartQuery = query(collection(db, "users"), where("role", "==", "customer"), where("createdAt", ">=", timestampSixMonthsAgo));
        const customersChartSnap = await getDocs(customersChartQuery);
        const customersMonthly: { [key: string]: number } = {};
        customersChartSnap.forEach(doc => {
            const customer = doc.data() as User;
            const monthKey = format((customer.createdAt as Timestamp).toDate(), 'MMM');
            customersMonthly[monthKey] = (customersMonthly[monthKey] || 0) + 1;
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

  const renderBarChartCard = (title: string, data: any[], dataKey: string, chartColor: string) => (
     <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? <div className="h-[300px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
              <ChartContainer config={chartConfig} className="min-h-[250px] h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey={dataKey} fill={chartColor} radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
             )}
          </CardContent>
        </Card>
  )

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
        {renderBarChartCard("Lead Generation", leadsChartData, "leads", "var(--color-leads)")}
        {renderBarChartCard("Partner Signups", partnersChartData, "partners", "var(--color-partners)")}
        {renderBarChartCard("Customer Signups", customersChartData, "customers", "var(--color-customers)")}
      </div>
       <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Upcoming Appointments</CardTitle>
            <CardDescription>
              Your next 5 upcoming appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <div className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                <div className="space-y-4">
                  {appointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex flex-col sm:flex-row items-start sm:items-center p-3 border rounded-md bg-muted/50 gap-4">
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium truncate">{appointment.lead?.name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground truncate">{appointment.property?.catalogTitle || 'N/A'}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                           <p className="font-medium text-sm">{format(appointment.visitDate as Date, "PPP")}</p>
                        </div>
                    </div>
                  ))}
                   {appointments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>}
                </div>
             )}
          </CardContent>
        </Card>
    </div>
  )
}
