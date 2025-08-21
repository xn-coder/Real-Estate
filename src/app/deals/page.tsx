
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
import { Loader2, Building, User, Search, Eye, FileText, Calendar, CheckCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"

type Deal = {
  lead: Lead;
  property?: Property;
  customer?: User;
}

const statusColors: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'Deal closed': 'default',
  'Document Submitted': 'secondary',
}

export default function DealsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchDeals = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const leadsCollection = collection(db, "leads");
      
      const q = query(leadsCollection, where("status", "in", ['Deal closed', 'Document Submitted']));

      const snapshot = await getDocs(q);
      const dealsDataPromises = snapshot.docs.map(async (docData) => {
        const lead = {
          id: docData.id,
          ...docData.data(),
          createdAt: (docData.data().createdAt as Timestamp).toDate(),
        } as Lead;
        
        const [propertyDoc, customerDoc] = await Promise.all([
            lead.propertyId ? getDoc(doc(db, "properties", lead.propertyId)) : null,
            lead.customerId ? getDoc(doc(db, "users", lead.customerId)) : null,
        ]);

        return { 
            lead, 
            property: propertyDoc?.exists() ? { id: propertyDoc.id, ...propertyDoc.data() } as Property : undefined,
            customer: customerDoc?.exists() ? { id: customerDoc.id, ...customerDoc.data() } as User : undefined,
        };
      });

      const dealsData = await Promise.all(dealsDataPromises);
      setDeals(dealsData.sort((a,b) => b.lead.createdAt.getTime() - a.lead.createdAt.getTime()));
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch deals.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if(user) {
        fetchDeals();
    }
  }, [user, fetchDeals]);
  
  const handleApproveDeal = async (leadId: string) => {
      try {
        await updateDoc(doc(db, "leads", leadId), { status: "Deal closed" });
        toast({ title: "Deal Approved", description: "The deal has been successfully closed." });
        fetchDeals(); // Refresh the list
      } catch (error) {
         console.error("Error approving deal:", error);
         toast({ variant: 'destructive', title: 'Error', description: 'Could not approve the deal.' });
      }
  }

  const filteredDeals = React.useMemo(() => {
    return deals.filter(deal => {
        const searchMatch = searchTerm === "" ||
            deal.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (deal.property && deal.property.catalogTitle.toLowerCase().includes(searchTerm.toLowerCase()));
        return searchMatch;
    });
  }, [deals, searchTerm]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Deals</h1>
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
      </div>

      <div className="overflow-x-auto">
        <div className="border rounded-lg min-w-[800px]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Deal Value</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : filteredDeals.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No deals found.
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredDeals.map((deal) => (
                    <TableRow key={deal.lead.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {deal.lead.name}
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {deal.property?.catalogTitle || deal.lead.propertyId}
                            </div>
                        </TableCell>
                        <TableCell>
                           {deal.lead.closingAmount ? `₹${deal.lead.closingAmount.toLocaleString()}` : 'N/A'}
                        </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(deal.lead.createdAt, 'PPP')}
                            </div>
                        </TableCell>
                         <TableCell>
                           <Badge variant={statusColors[deal.lead.status] || 'default'}>{deal.lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           {deal.lead.status === 'Document Submitted' && (
                            <Button variant="outline" size="sm" onClick={() => handleApproveDeal(deal.lead.id)}>
                               <CheckCircle className="mr-2 h-4 w-4"/> Approve
                            </Button>
                           )}
                           {deal.lead.status === 'Deal closed' && (
                                <span className="text-xs text-muted-foreground">Completed</span>
                           )}
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
