
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
import { Button } from "@/components/ui/button"
import { Loader2, Pencil, Search, User, Users, Handshake } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc, writeBatch, Timestamp, orderBy, limit } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import type { User as PartnerUser } from "@/types/user"
import type { Lead } from "@/types/lead"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type CustomerWithConsultant = {
  customer: CustomerUser;
  consultant?: PartnerUser;
};

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
const sellerRoles = ['seller', 'admin'];

export default function ManageConsultantPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = React.useState<CustomerWithConsultant[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerUser | null>(null)
  const [selectedConsultant, setSelectedConsultant] = React.useState<PartnerUser | null>(null)
  
  const [allPartners, setAllPartners] = React.useState<PartnerUser[]>([])
  const [allSellers, setAllSellers] = React.useState<PartnerUser[]>([])
  const [isLoadingConsultants, setIsLoadingConsultants] = React.useState(true)
  const [consultantSearchTerm, setConsultantSearchTerm] = React.useState("")
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState("")
  const [assignmentType, setAssignmentType] = React.useState<'partner' | 'seller'>('partner');


  const fetchConsultantData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const customersQuery = query(collection(db, "users"), where("role", "==", "customer"));
        const customersSnapshot = await getDocs(customersQuery);
        const customerList = customersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomerUser));

        const enrichedCustomers = await Promise.all(
            customerList.map(async (customer) => {
                const leadsQuery = query(collection(db, "leads"), where("customerId", "==", customer.id), orderBy("createdAt", "desc"), limit(1));
                const leadsSnapshot = await getDocs(leadsQuery);

                if (!leadsSnapshot.empty) {
                    const lead = leadsSnapshot.docs[0].data() as Lead;
                    if (lead.partnerId) {
                        const partnerDoc = await getDoc(doc(db, "users", lead.partnerId));
                        if (partnerDoc.exists()) {
                            return { customer, consultant: { id: partnerDoc.id, ...partnerDoc.data() } as PartnerUser };
                        }
                    }
                }
                return { customer, consultant: undefined };
            })
        );
        setCustomers(enrichedCustomers);

    } catch (error) {
        console.error("Error fetching consultant data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch consultant data." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  const fetchAllConsultants = React.useCallback(async () => {
    setIsLoadingConsultants(true);
    try {
        const partnersQuery = query(collection(db, "users"), where("role", "in", partnerRoles));
        const sellersQuery = query(collection(db, "users"), where("role", "in", sellerRoles));

        const [partnersSnapshot, sellersSnapshot] = await Promise.all([
            getDocs(partnersQuery),
            getDocs(sellersQuery),
        ]);
        
        setAllPartners(partnersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerUser)));
        setAllSellers(sellersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerUser)));
    } catch (error) {
        console.error("Error fetching partners:", error);
    } finally {
        setIsLoadingConsultants(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConsultantData();
    fetchAllConsultants();
  }, [fetchConsultantData, fetchAllConsultants]);

  const filteredConsultants = React.useMemo(() => {
      if (!consultantSearchTerm) return [];
      const listToSearch = assignmentType === 'partner' ? allPartners : allSellers;
      return listToSearch.filter(p => p.name.toLowerCase().includes(consultantSearchTerm.toLowerCase()) || p.email.toLowerCase().includes(consultantSearchTerm.toLowerCase()));
  }, [allPartners, allSellers, consultantSearchTerm, assignmentType]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter(c => 
        c.customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.consultant && c.consultant.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    );
  }, [customers, customerSearchTerm]);

  const handleModifyClick = (customer: CustomerUser) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  }
  
  const handleSelectConsultant = (consultant: PartnerUser) => {
    setSelectedConsultant(consultant);
    setConsultantSearchTerm("");
  }
  
  const handleReassign = async () => {
      if (!selectedCustomer || !selectedConsultant) {
          toast({ variant: 'destructive', title: 'Error', description: 'Customer or consultant not selected.'});
          return;
      }
      setIsUpdating(true);
      try {
        const leadsQuery = query(collection(db, "leads"), where("customerId", "==", selectedCustomer.id));
        const leadsSnapshot = await getDocs(leadsQuery);
        
        if (leadsSnapshot.empty) {
            toast({ variant: 'destructive', title: 'No Leads', description: 'This customer has no leads to reassign.' });
            setIsUpdating(false);
            return;
        }
        
        const batch = writeBatch(db);
        leadsSnapshot.docs.forEach(leadDoc => {
            batch.update(doc(db, "leads", leadDoc.id), { partnerId: selectedConsultant.id });
        });
        
        await batch.commit();

        toast({ title: 'Success', description: `${selectedCustomer.name}'s consultant has been updated to ${selectedConsultant.name}.` });
        fetchConsultantData();
        setIsDialogOpen(false);
        setSelectedCustomer(null);
        setSelectedConsultant(null);

      } catch (error) {
         console.error("Error reassigning consultant:", error);
         toast({ variant: "destructive", title: "Error", description: "Failed to reassign consultant." });
      } finally {
        setIsUpdating(false);
      }
  }


  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Consultants</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Customer-Consultant Assignments</CardTitle>
           <div className="flex items-center justify-between gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by customer or consultant..."
                className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assigned Consultant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">No customers found.</TableCell></TableRow>
                ) : (
                  filteredCustomers.map(({ customer, consultant }) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </TableCell>
                      <TableCell>
                        {consultant ? (
                           <>
                            <div className="font-medium">{consultant.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                                {sellerRoles.includes(consultant.role) ? "Seller" : consultant.role.replace('_', ' ')}
                            </div>
                           </>
                        ) : (
                          <span className="text-muted-foreground">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleModifyClick(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modify
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setSelectedCustomer(null); setSelectedConsultant(null); setConsultantSearchTerm(""); } setIsDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Modify Consultant for {selectedCustomer?.name}</DialogTitle>
                <DialogDescription>Choose to assign a Partner or a Seller, then search and select the user.</DialogDescription>
            </DialogHeader>
            <Tabs value={assignmentType} onValueChange={(value) => { setAssignmentType(value as any); setSelectedConsultant(null); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="partner"><Handshake className="mr-2 h-4 w-4"/> Assign Partner</TabsTrigger>
                    <TabsTrigger value="seller"><User className="mr-2 h-4 w-4"/> Assign Seller</TabsTrigger>
                </TabsList>
                <div className="py-4 space-y-2 min-h-[16rem]">
                     {selectedConsultant ? (
                        <div className="flex items-center gap-4 p-2 border rounded-md">
                            <Avatar>
                                <AvatarImage src={selectedConsultant.profileImage} />
                                <AvatarFallback>{selectedConsultant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium">{selectedConsultant.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                    {sellerRoles.includes(selectedConsultant.role) ? 'Seller' : selectedConsultant.role.replace('_', ' ')}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedConsultant(null)}>Change</Button>
                        </div>
                    ) : (
                        <div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder={`Search for a ${assignmentType}...`}
                                    className="pl-8"
                                    value={consultantSearchTerm}
                                    onChange={e => setConsultantSearchTerm(e.target.value)}
                                />
                            </div>
                            {consultantSearchTerm && (
                                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                                    {isLoadingConsultants ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                    ) : filteredConsultants.length > 0 ? filteredConsultants.map(p => (
                                        <div key={p.id} onClick={() => handleSelectConsultant(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                            <p>{p.name} ({p.email})</p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {sellerRoles.includes(p.role) ? 'Seller' : p.role.replace('_', ' ')}
                                            </p>
                                        </div>
                                    )) : <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Tabs>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleReassign} disabled={isUpdating || !selectedConsultant}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Reassign Consultant
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
