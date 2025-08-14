
'use client'

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Lead } from "@/types/lead"
import type { Property } from "@/types/property"
import type { User } from "@/types/user"
import { Loader2, ArrowLeft, User as UserIcon, Building, Handshake, DollarSign, Upload, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

// Data types
type BookingDetails = {
    lead: Lead;
    property?: Property;
    customer?: User;
    partner?: User;
}

export default function BookingDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const leadId = params.id as string

    const [details, setDetails] = React.useState<BookingDetails | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        if (!leadId) return;

        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const leadDocRef = doc(db, "leads", leadId);
                const leadDoc = await getDoc(leadDocRef);

                if (!leadDoc.exists()) {
                    // handle not found
                    return;
                }
                const leadData = { id: leadDoc.id, ...leadDoc.data() } as Lead;

                const [propertyDoc, customerDoc, partnerDoc] = await Promise.all([
                    leadData.propertyId ? getDoc(doc(db, "properties", leadData.propertyId)) : null,
                    leadData.customerId ? getDoc(doc(db, "users", leadData.customerId)) : null,
                    leadData.partnerId ? getDoc(doc(db, "users", leadData.partnerId)) : null
                ]);

                setDetails({
                    lead: leadData,
                    property: propertyDoc?.exists() ? { id: propertyDoc.id, ...propertyDoc.data() } as Property : undefined,
                    customer: customerDoc?.exists() ? { id: customerDoc.id, ...customerDoc.data() } as User : undefined,
                    partner: partnerDoc?.exists() ? { id: partnerDoc.id, ...partnerDoc.data() } as User : undefined,
                });
            } catch (error) {
                console.error("Error fetching booking details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [leadId]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!details) {
        return <div className="flex-1 flex items-center justify-center"><p>Booking not found.</p></div>
    }

    const { lead, property, customer, partner } = details;
    
    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('') : '';

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Booking Details</h1>
                    <p className="text-muted-foreground">Lead ID: {lead.id}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Property Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-muted-foreground"/> Property Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {property ? (
                               <div className="space-y-4">
                                   <h3 className="font-semibold text-lg">{property.catalogTitle}</h3>
                                   <p className="text-muted-foreground">{property.addressLine}, {property.city}</p>
                                    <Separator />
                                     <div className="grid grid-cols-2 gap-4 text-sm">
                                        <p><strong>Category:</strong> {property.propertyCategory}</p>
                                        <p><strong>Bedrooms:</strong> {property.bedrooms}</p>
                                        <p><strong>Bathrooms:</strong> {property.bathrooms}</p>
                                        <p><strong>Area:</strong> {property.builtUpArea} {property.unitOfMeasurement}</p>
                                    </div>
                               </div>
                           ) : <p>Property details not available.</p>}
                        </CardContent>
                    </Card>

                    {/* Pricing Details */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground"/> Pricing Details</CardTitle>
                        </CardHeader>
                         <CardContent>
                           {property ? (
                               <Table>
                                 <TableBody>
                                   <TableRow><TableCell>Listing Price</TableCell><TableCell className="text-right font-medium">₹{property.listingPrice.toLocaleString()}</TableCell></TableRow>
                                   <TableRow><TableCell>Booking Amount</TableCell><TableCell className="text-right font-medium">₹{property.bookingAmount.toLocaleString()}</TableCell></TableRow>
                                   <TableRow><TableCell>Security Deposit</TableCell><TableCell className="text-right font-medium">₹{property.securityDeposit.toLocaleString()}</TableCell></TableRow>
                                   <TableRow><TableCell>Maintenance Charge</TableCell><TableCell className="text-right font-medium">₹{property.maintenanceCharge.toLocaleString()}</TableCell></TableRow>
                                 </TableBody>
                               </Table>
                           ) : <p>Pricing details not available.</p>}
                        </CardContent>
                    </Card>
                    
                    {/* Document Uploads */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground"/> Document Uploads</CardTitle>
                             <CardDescription>Upload and manage client and property documents.</CardDescription>
                        </CardHeader>
                         <CardContent className="text-center py-10">
                            <Button><Upload className="mr-2 h-4 w-4"/> Upload Documents</Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {/* Client Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5 text-muted-foreground"/> Client Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {customer ? (
                               <div className="flex items-center gap-4">
                                   <Avatar>
                                       <AvatarImage src={customer.profileImage} />
                                       <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                                   </Avatar>
                                    <div>
                                       <p className="font-semibold">{customer.name}</p>
                                       <p className="text-sm text-muted-foreground">{customer.email}</p>
                                   </div>
                               </div>
                           ) : <p>Client details not available.</p>}
                        </CardContent>
                    </Card>
                     {/* Partner Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5 text-muted-foreground"/> Partner Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {partner ? (
                                <div className="flex items-center gap-4">
                                   <Avatar>
                                       <AvatarImage src={partner.profileImage} />
                                       <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
                                   </Avatar>
                                    <div>
                                       <p className="font-semibold">{partner.name}</p>
                                       <p className="text-sm text-muted-foreground">{partner.email}</p>
                                   </div>
                               </div>
                           ) : <p>Partner details not available.</p>}
                        </CardContent>
                    </Card>
                     {/* Close Deal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Close Deal</CardTitle>
                            <CardDescription>Finalize the booking and mark the deal as completed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button className="w-full"><CheckCircle className="mr-2 h-4 w-4"/> Mark as Completed</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
