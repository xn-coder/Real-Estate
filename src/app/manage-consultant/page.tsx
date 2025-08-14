
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
import { collection, getDocs, query, where, doc, getDoc, writeBatch, Timestamp, orderBy, limit } from "firebase/firestore"
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

type CustomerWithConsultants = {
  customer: CustomerUser;
  partner?: PartnerUser;
  seller?: SellerUser;
};

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
const sellerRoles = ['seller', 'admin'];

export default function ManageConsultantPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = React.useState<CustomerWithConsultants[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerWithConsultants | null>(null)
  
  const [newPartner, setNewPartner] = React.useState<PartnerUser | null>(null);
  const [newSeller, setNewSeller] = React.useState<SellerUser | null>(null);
  
  const [allPartners, setAllPartners] = React.useState<PartnerUser[]>([])
  const [allSellers, setAllSellers] = React.useState<SellerUser[]>([])
  const [isLoadingConsultants, setIsLoadingConsultants] = React.useState(true)

  const [partnerSearchTerm, setPartnerSearchTerm] = React.useState("");
  const [sellerSearchTerm, setSellerSearchTerm] = React.useState("");
  
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState("")
  
  const [isChangingPartner, setIsChangingPartner] = React.useState(false);
  const [isChangingSeller, setIsChangingSeller] = React.useState(false);


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

                let partner: PartnerUser | undefined;
                let seller: SellerUser | undefined;

                if (!leadsSnapshot.empty) {
                    const lead = leadsSnapshot.docs[0].data() as Lead;
                    
                    if (lead.partnerId) {
                        const partnerDoc = await getDoc(doc(db, "users", lead.partnerId));
                        if (partnerDoc.exists()) {
                            partner = { id: partnerDoc.id, ...partnerDoc.data() } as PartnerUser;
                        }
                    }
                    
                    if (lead.propertyId) {
                        const propertyDoc = await getDoc(doc(db, "properties", lead.propertyId));
                        if (propertyDoc.exists()) {
                            const propertyData = propertyDoc.data() as Property;
                            if (propertyData.email) {
                                const sellerQuery = query(collection(db, "users"), where("email", "==", propertyData.email), limit(1));
                                const sellerSnapshot = await getDocs(sellerQuery);
                                if (!sellerSnapshot.empty) {
                                    const sellerDoc = sellerSnapshot.docs[0];
                                    seller = { id: sellerDoc.id, ...sellerDoc.data() } as SellerUser;
                                }
                            }
                        }
                    }
                }
                return { customer, partner, seller };
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
        setAllSellers(sellersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SellerUser)));
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

  const filteredPartners = React.useMemo(() => {
      if (!partnerSearchTerm) return [];
      return allPartners.filter(p => p.name.toLowerCase().includes(partnerSearchTerm.toLowerCase()) || p.email.toLowerCase().includes(partnerSearchTerm.toLowerCase()));
  }, [allPartners, partnerSearchTerm]);

  const filteredSellers = React.useMemo(() => {
      if (!sellerSearchTerm) return [];
      return allSellers.filter(s => s.name.toLowerCase().includes(sellerSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(sellerSearchTerm.toLowerCase()));
  }, [allSellers, sellerSearchTerm]);


  const filteredCustomers = React.useMemo(() => {
    return customers.filter(c => 
        c.customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.partner && c.partner.name.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.seller && c.seller.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    );
  }, [customers, customerSearchTerm]);

  const handleModifyClick = (customerData: CustomerWithConsultants) => {
    setSelectedCustomer(customerData);
    setNewPartner(customerData.partner || null);
    setNewSeller(customerData.seller || null);
    setIsDialogOpen(true);
  }
  
  const handleSelectPartner = (partner: PartnerUser) => {
    setNewPartner(partner);
    setPartnerSearchTerm("");
    setIsChangingPartner(false);
  }

  const handleSelectSeller = (seller: SellerUser) => {
    setNewSeller(seller);
    setSellerSearchTerm("");
    setIsChangingSeller(false);
  }
  
  const handleReassign = async () => {
      if (!selectedCustomer) {
          toast({ variant: 'destructive', title: 'Error', description: 'Customer not selected.'});
          return;
      }
      setIsUpdating(true);
      try {
        const leadsQuery = query(collection(db, "leads"), where("customerId", "==", selectedCustomer.customer.id));
        const leadsSnapshot = await getDocs(leadsQuery);
        
        if (leadsSnapshot.empty) {
            toast({ variant: 'destructive', title: 'No Leads', description: 'This customer has no leads to reassign.' });
            setIsUpdating(false);
            return;
        }
        
        const batch = writeBatch(db);
        
        if (newPartner && newPartner.id !== selectedCustomer.partner?.id) {
             leadsSnapshot.docs.forEach(leadDoc => {
                batch.update(doc(db, "leads", leadDoc.id), { partnerId: newPartner.id });
            });
             toast({ title: 'Success', description: `${selectedCustomer.customer.name}'s partner has been updated to ${newPartner.name}.` });
        }
        
        // Note: Seller reassignment is complex as it's tied to the property.
        // This functionality might need a more detailed implementation if properties need to change.
        if (newSeller && newSeller.id !== selectedCustomer.seller?.id) {
            console.log("Seller reassignment requested. This requires more complex logic not yet implemented.");
            toast({ variant: "default", title: 'Info', description: `Seller reassignment logic is not fully implemented.` });
        }
        
        await batch.commit();

        fetchConsultantData();
        setIsDialogOpen(false);

      } catch (error) {
         console.error("Error reassigning consultant:", error);
         toast({ variant: "destructive", title: "Error", description: "Failed to reassign consultant." });
      } finally {
        setIsUpdating(false);
        setNewPartner(null);
        setNewSeller(null);
        setIsChangingPartner(false);
        setIsChangingSeller(false);
      }
  }

  const renderConsultantSelector = (
      type: 'partner' | 'seller',
      currentConsultant: PartnerUser | SellerUser | null,
      isChanging: boolean,
      setIsChanging: (val: boolean) => void,
      searchTerm: string,
      setSearchTerm: (val: string) => void,
      filteredList: (PartnerUser | SellerUser)[],
      handleSelect: (consultant: any) => void,
      isLoadingList: boolean
  ) => (
      <div>
          <Label className="capitalize">{type}</Label>
          {!isChanging && currentConsultant ? (
               <div className="flex items-center gap-4 p-2 border rounded-md mt-1">
                  <Avatar>
                      <AvatarImage src={currentConsultant.profileImage} />
                      <AvatarFallback>{currentConsultant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                      <p className="font-medium">{currentConsultant.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{type === 'seller' && currentConsultant.role === 'admin' ? 'Seller' : type}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsChanging(true)}>Change</Button>
              </div>
          ) : (
              <div>
                  <div className="relative mt-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder={`Search for a ${type}...`}
                          className="pl-8"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  {searchTerm && (
                      <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                          {isLoadingList ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                          ) : filteredList.length > 0 ? filteredList.map(c => (
                              <div key={c.id} onClick={() => handleSelect(c)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                  <p>{c.name} ({c.email})</p>
                              </div>
                          )) : <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>}
                      </div>
                  )}
              </div>
          )}
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
                                <div className="text-sm text-muted-foreground">{c.customer.email}</div>
                            </TableCell>
                            <TableCell>
                                {c.partner ? (
                                <>
                                    <div className="font-medium">{c.partner.name}</div>
                                    <div className="text-sm text-muted-foreground capitalize">Partner</div>
                                </>
                                ) : (
                                <span className="text-muted-foreground">Not Assigned</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {c.seller ? (
                                <>
                                    <div className="font-medium">{c.seller.name}</div>
                                    <div className="text-sm text-muted-foreground capitalize">
                                        {c.seller.role === 'admin' ? 'Seller' : c.seller.role}
                                    </div>
                                </>
                                ) : (
                                <span className="text-muted-foreground">Not Assigned</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleModifyClick(c)}>
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
                        This feature is coming soon.
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
                    <p>Partner to consultant management will be available here.</p>
                </CardContent>
            </Card>
        </TabsContent>
       </Tabs>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsChangingPartner(false); setIsChangingSeller(false); } setIsDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Modify Consultant for {selectedCustomer?.customer.name}</DialogTitle>
                <DialogDescription>Change the assigned Partner or Seller.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {renderConsultantSelector(
                    'partner',
                    newPartner,
                    isChangingPartner,
                    setIsChangingPartner,
                    partnerSearchTerm,
                    setPartnerSearchTerm,
                    filteredPartners,
                    handleSelectPartner,
                    isLoadingConsultants
                )}
                 {renderConsultantSelector(
                    'seller',
                    newSeller,
                    isChangingSeller,
                    setIsChangingSeller,
                    sellerSearchTerm,
                    setSellerSearchTerm,
                    filteredSellers,
                    handleSelectSeller,
                    isLoadingConsultants
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleReassign} disabled={isUpdating || (!newPartner && !newSeller)}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Reassign
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
