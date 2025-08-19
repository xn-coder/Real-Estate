
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
import { Loader2, Pencil, Search, User as UserIcon, Users, Handshake, Replace } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc, writeBatch, Timestamp, orderBy, limit, updateDoc, addDoc } from "firebase/firestore"
import type { User as CustomerUser } from "@/types/user"
import type { User as PartnerUser } from "@/types/user"
import type { User as SellerUser } from "@/types/user"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"


type CustomerWithConsultants = {
  customer: CustomerUser;
  partner?: PartnerUser;
  seller?: SellerUser;
};

type PartnerWithSeller = {
    partner: PartnerUser;
    seller?: SellerUser;
}

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
const sellerRoles = ['seller', 'admin'];
const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};


export default function ManageConsultantPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = React.useState<CustomerWithConsultants[]>([])
  const [partners, setPartners] = React.useState<PartnerWithSeller[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerWithConsultants | null>(null)
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerWithSeller | null>(null)
  
  const [newConsultant, setNewConsultant] = React.useState<PartnerUser | SellerUser | null>(null);
  const [activeDialogTab, setActiveDialogTab] = React.useState<'partner' | 'seller'>('partner');

  const [allSellers, setAllSellers] = React.useState<SellerUser[]>([])
  const [allPartners, setAllPartners] = React.useState<PartnerUser[]>([])
  const [isLoadingConsultants, setIsLoadingConsultants] = React.useState(true)

  const [consultantSearchTerm, setConsultantSearchTerm] = React.useState("");
  
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState("")
  

  const fetchConsultantData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const usersCollection = collection(db, "users");
        
        const adminQuery = query(usersCollection, where("role", "==", "admin"), limit(1));
        const adminSnapshot = await getDocs(adminQuery);
        const adminProfile = adminSnapshot.empty ? null : {id: adminSnapshot.docs[0].id, ...adminSnapshot.docs[0].data()} as SellerUser;

        const allPartnersQuery = query(usersCollection, where("role", "in", partnerRoles));
        const allPartnersSnapshot = await getDocs(allPartnersQuery);
        const partnersList = await Promise.all(
            allPartnersSnapshot.docs.map(async pDoc => {
                const partnerData = {id: pDoc.id, ...pDoc.data()} as PartnerUser;
                let seller: SellerUser | undefined;
                if(partnerData.teamLeadId) { 
                    const sellerDoc = await getDoc(doc(db, "users", partnerData.teamLeadId));
                    if(sellerDoc.exists()) seller = {id: sellerDoc.id, ...sellerDoc.data()} as SellerUser;
                }
                return { partner: partnerData, seller: seller || adminProfile || undefined };
            })
        )
        setPartners(partnersList);
        setAllPartners(partnersList.map(p => p.partner));


        const customersQuery = query(usersCollection, where("role", "==", "customer"));
        const customersSnapshot = await getDocs(customersQuery);
        const customerList = customersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomerUser));

        const enrichedCustomers = await Promise.all(
            customerList.map(async (customer) => {
                const leadsQuery = query(collection(db, "leads"), where("customerId", "==", customer.id), orderBy("createdAt", "desc"), limit(1));
                const leadsSnapshot = await getDocs(leadsQuery);

                let partner: PartnerUser | undefined;
                let seller: SellerUser | undefined;
                
                // Directly assigned seller takes precedence
                if (customer.teamLeadId) {
                    const sellerDoc = await getDoc(doc(db, "users", customer.teamLeadId));
                    if (sellerDoc.exists()) seller = { id: sellerDoc.id, ...sellerDoc.data() } as SellerUser;
                }


                if (!leadsSnapshot.empty) {
                    const lead = leadsSnapshot.docs[0].data() as Lead;
                    
                    if (lead.partnerId) {
                        const partnerDoc = await getDoc(doc(db, "users", lead.partnerId));
                        if (partnerDoc.exists()) {
                            partner = { id: partnerDoc.id, ...partnerDoc.data() } as PartnerUser;
                        }
                    }
                    
                    // If no seller is directly assigned, try to infer from property
                    if (!seller && lead.propertyId) {
                        const propertyDoc = await getDoc(doc(db, "properties", lead.propertyId));
                        if (propertyDoc.exists()) {
                            const propertyData = propertyDoc.data() as Property;
                            if (propertyData.email) {
                                const sellerQuery = query(usersCollection, where("email", "==", propertyData.email), limit(1));
                                const sellerSnapshot = await getDocs(sellerQuery);
                                if (!sellerSnapshot.empty) {
                                    const sellerDoc = sellerSnapshot.docs[0];
                                    seller = { id: sellerDoc.id, ...sellerDoc.data() } as SellerUser;
                                }
                            }
                        }
                    }
                }
                return { customer, partner, seller: seller || adminProfile || undefined };
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
  
  const fetchAllConsultantsForDialog = React.useCallback(async () => {
    setIsLoadingConsultants(true);
    try {
        const usersCollection = collection(db, "users");
        
        const partnersQuery = query(usersCollection, where("role", "in", partnerRoles));
        const partnersSnapshot = await getDocs(partnersQuery);
        setAllPartners(partnersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerUser)));

        
        const sellersQuery = query(usersCollection, where("role", "in", sellerRoles));
        const sellersSnapshot = await getDocs(sellersQuery);
        setAllSellers(sellersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SellerUser)));

    } catch (error) {
        console.error("Error fetching partners:", error);
    } finally {
        setIsLoadingConsultants(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConsultantData();
  }, [fetchConsultantData]);

  const filteredConsultantsForDialog = React.useMemo(() => {
      if (!consultantSearchTerm) return [];
      let listToSearch: (PartnerUser | SellerUser)[] = [];
      if (activeDialogTab === 'partner') listToSearch = allPartners;
      if (activeDialogTab === 'seller') listToSearch = allSellers.filter(s => s.id.startsWith("SEL") || s.role === 'admin');

      return listToSearch.filter(p => p.name.toLowerCase().includes(consultantSearchTerm.toLowerCase()) || p.email.toLowerCase().includes(consultantSearchTerm.toLowerCase()));
  }, [allPartners, allSellers, consultantSearchTerm, activeDialogTab]);


  const filteredCustomers = React.useMemo(() => {
    return customers.filter(c => 
        c.customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.partner && c.partner.name.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.seller && c.seller.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    );
  }, [customers, customerSearchTerm]);
  

  const handleModifyCustomerClick = (customerData: CustomerWithConsultants) => {
    setSelectedCustomer(customerData);
    setSelectedPartner(null);
    setActiveDialogTab('partner');
    setNewConsultant(customerData.partner || null);
    fetchAllConsultantsForDialog();
    setIsDialogOpen(true);
  }
  
  const handleModifyPartnerClick = (partnerData: PartnerWithSeller) => {
    setSelectedCustomer(null);
    setSelectedPartner(partnerData);
    setActiveDialogTab('seller');
    setNewConsultant(partnerData.seller || null);
    fetchAllConsultantsForDialog();
    setIsDialogOpen(true);
  }

  const handleSelectConsultant = (consultant: PartnerUser | SellerUser) => {
    setNewConsultant(consultant);
    setConsultantSearchTerm("");
  }
  
  const handleReassign = async () => {
      if (!selectedCustomer && !selectedPartner) return;
      if (!newConsultant) {
          toast({ variant: 'destructive', title: 'Error', description: 'No consultant selected.'});
          return;
      }
      
      setIsUpdating(true);
      try {
        if(selectedCustomer) {
            const customer = selectedCustomer.customer;
            const customerRef = doc(db, "users", customer.id);
            const batch = writeBatch(db);

            if (newConsultant.role === 'seller' || newConsultant.role === 'admin') {
                // Directly assign seller to customer
                batch.update(customerRef, { teamLeadId: newConsultant.id });
            } else { // It's a partner
                // Reassign all of the customer's leads to the new partner
                const leadsQuery = query(collection(db, "leads"), where("customerId", "==", customer.id));
                const leadsSnapshot = await getDocs(leadsQuery);
                if (leadsSnapshot.empty) {
                    toast({ variant: 'destructive', title: 'No Leads', description: 'This customer has no leads to reassign.' });
                } else {
                    leadsSnapshot.docs.forEach(leadDoc => {
                        batch.update(doc(db, "leads", leadDoc.id), { partnerId: newConsultant.id });
                    });
                }
            }
            await batch.commit();
            toast({ title: 'Success', description: `${activeDialogTab} for ${customer.name} has been updated.` });

        } else if (selectedPartner) {
            const partnerRef = doc(db, "users", selectedPartner.partner.id);
            await updateDoc(partnerRef, { teamLeadId: newConsultant.id });
            toast({ title: 'Success', description: `Seller for ${selectedPartner.partner.name} has been updated.` });
        }
        
        fetchConsultantData();
        setIsDialogOpen(false);

      } catch (error) {
         console.error("Error reassigning consultant:", error);
         toast({ variant: "destructive", title: "Error", description: "Failed to reassign consultant." });
      } finally {
        setIsUpdating(false);
        setNewConsultant(null);
      }
  }

  const renderConsultantSelector = (
      type: 'partner' | 'seller',
      currentConsultant: PartnerUser | SellerUser | null
  ) => (
      <div>
          <Label className="capitalize">{type}</Label>
           <div className="flex items-center gap-4 p-2 border rounded-md mt-1 bg-muted/50">
              <Avatar>
                  <AvatarImage src={currentConsultant?.profileImage} />
                  <AvatarFallback>{currentConsultant?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                  <p className="font-medium">{currentConsultant?.name || 'Not selected'}</p>
                  <p className="text-sm text-muted-foreground capitalize">{currentConsultant?.role.replace('_', ' ') || type}</p>
              </div>
          </div>
          <div className="mt-2">
              <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder={`Search for a new ${type}...`}
                      className="pl-8"
                      value={consultantSearchTerm}
                      onChange={e => setConsultantSearchTerm(e.target.value)}
                  />
              </div>
              {consultantSearchTerm && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                      {isLoadingConsultants ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                      ) : filteredConsultantsForDialog.length > 0 ? filteredConsultantsForDialog.map(c => (
                          <div key={c.id} onClick={() => handleSelectConsultant(c)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                              <p>{c.name} ({c.email})</p>
                          </div>
                      )) : <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>}
                  </div>
              )}
          </div>
      </div>
  );


  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Consultants</h1>
      
       <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
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
                        <TableHead>Assigned Partner</TableHead>
                        <TableHead>Assigned Seller</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : filteredCustomers.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No customers found.</TableCell></TableRow>
                        ) : (
                        filteredCustomers.map((c) => (
                            <TableRow key={c.customer.id}>
                            <TableCell>
                                <div className="font-medium">{c.customer.name}</div>
                                <div className="text-sm text-muted-foreground font-mono">{c.customer.id}</div>
                            </TableCell>
                            <TableCell>
                                {c.partner ? (
                                <Link href={`/manage-partner/${c.partner.id}`} className="hover:underline">
                                    <div className="font-medium">{c.partner.name}</div>
                                    <div className="text-sm text-muted-foreground font-mono">{c.partner.id}</div>
                                </Link>
                                ) : (
                                <span className="text-muted-foreground">Not Assigned</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {c.seller ? (
                                <Link href={`/manage-seller/details/${c.seller.id}`} className="hover:underline">
                                    <div className="font-medium">{c.seller.name}</div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                        {c.seller.id}
                                    </div>
                                </Link>
                                ) : (
                                <span className="text-muted-foreground">Not Assigned</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleModifyCustomerClick(c)}>
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
        </TabsContent>
        <TabsContent value="partners">
            <Card>
                <CardHeader>
                    <CardTitle>Partner-Consultant Assignments</CardTitle>
                    <CardDescription>
                        View all partners and their assigned sellers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Partner Name</TableHead>
                                <TableHead>Partner Role</TableHead>
                                <TableHead>Assigned Seller</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : partners.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No partners found.</TableCell></TableRow>
                            ) : (
                                partners.map(p => (
                                    <TableRow key={p.partner.id}>
                                        <TableCell>
                                            <div className="font-medium">{p.partner.name}</div>
                                            <div className="text-sm text-muted-foreground font-mono">{p.partner.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{roleNameMapping[p.partner.role] || p.partner.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {p.seller ? (
                                                <Link href={`/manage-seller/details/${p.seller.id}`} className="hover:underline">
                                                    <div className="font-medium">{p.seller.name}</div>
                                                    <div className="text-sm text-muted-foreground font-mono">
                                                        {p.seller.id}
                                                    </div>
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">Default (Admin)</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleModifyPartnerClick(p)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Modify
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
        </TabsContent>
       </Tabs>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setConsultantSearchTerm(""); } setIsDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                 <DialogTitle>Modify Consultant for {selectedCustomer?.customer.name || selectedPartner?.partner.name}</DialogTitle>
                 {selectedCustomer && (
                     <DialogDescription>Change the assigned partner or seller.</DialogDescription>
                 )}
                 {selectedPartner && (
                      <DialogDescription>Change the assigned seller.</DialogDescription>
                 )}
            </DialogHeader>
            <div className="space-y-4 py-4">
                {selectedCustomer && (
                    <Tabs value={activeDialogTab} onValueChange={(value) => setActiveDialogTab(value as 'partner' | 'seller')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="partner">Assign Partner</TabsTrigger>
                            <TabsTrigger value="seller">Assign Seller</TabsTrigger>
                        </TabsList>
                        <TabsContent value="partner">
                            {renderConsultantSelector('partner', newConsultant?.role !== 'seller' ? newConsultant : null)}
                        </TabsContent>
                         <TabsContent value="seller">
                            {renderConsultantSelector('seller', newConsultant?.role === 'seller' ? newConsultant : null)}
                        </TabsContent>
                    </Tabs>
                )}
                 {selectedPartner && renderConsultantSelector('seller', newConsultant)}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleReassign} disabled={isUpdating || !newConsultant}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Reassign
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
