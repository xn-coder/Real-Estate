
'use client'

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Building, User, Search, Eye } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Booking = {
  lead: Lead;
  property?: Property;
}

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'New': 'default',
  'Qualified': 'secondary',
  'Processing': 'outline',
  'Under Contract': 'default',
}

const filterStatuses: (Lead['status'] | 'All')[] = ['All', 'New', 'Qualified', 'Processing', 'Under Contract'];

export default function BookingManagementPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<Lead['status'] | 'All'>("All");

  const fetchBookings = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const leadsCollection = collection(db, "leads");
      const activeLeadStatuses: Lead['status'][] = ['New', 'Qualified', 'Processing', 'Under Contract'];

      let q;
      if (user.role === 'admin' || user.role === 'seller') {
        q = query(leadsCollection, where("status", "in", activeLeadStatuses));
      } else { // Partner roles
        q = query(leadsCollection, where("partnerId", "==", user.id), where("status", "in", activeLeadStatuses));
      }

      const snapshot = await getDocs(q);
      const bookingsDataPromises = snapshot.docs.map(async (docData) => {
        const lead = {
          id: docData.id,
          ...docData.data(),
          createdAt: (docData.data().createdAt as Timestamp).toDate(),
        } as Lead;
        
        let property: Property | undefined;
        if (lead.propertyId) {
            const propDoc = await getDoc(doc(db, "properties", lead.propertyId));
            if (propDoc.exists()) {
                property = propDoc.data() as Property;
            }
        }
        return { lead, property };
      });

      const bookingsData = await Promise.all(bookingsDataPromises);
      setBookings(bookingsData.sort((a,b) => b.lead.createdAt.getTime() - a.lead.createdAt.getTime()));
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch bookings.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if(user) {
        fetchBookings();
    }
  }, [user, fetchBookings]);

  const filteredBookings = React.useMemo(() => {
    return bookings.filter(booking => {
        const statusMatch = activeFilter === 'All' || booking.lead.status === activeFilter;
        const searchMatch = searchTerm === "" ||
            booking.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (booking.property && booking.property.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()));
        return statusMatch && searchMatch;
    });
  }, [bookings, searchTerm, activeFilter]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Booking Management</h1>
      </div>

       <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by client or property..."
            className="pl-8 sm:w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as Lead['status'] | 'All')}>
          <TabsList>
            {filterStatuses.map(status => (
                 <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto">
        <div className="border rounded-lg min-w-[800px]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                    <span className="sr-only">Actions</span>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : filteredBookings.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No active bookings found.
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredBookings.map((booking) => (
                    <TableRow key={booking.lead.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {booking.lead.name}
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {booking.property?.catalogTitle || booking.lead.propertyId}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={statusColors[booking.lead.status] || 'default'}>{booking.lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4"/>
                                View Details
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </div>
    </div>
  )
}
