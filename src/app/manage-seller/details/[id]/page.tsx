
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Building, Briefcase, FileText, User, Phone, Mail, CheckCircle, XCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User as SellerUser } from "@/types/user"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"

export default function SellerDetailsPage() {
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const sellerId = params.id as string;

  const [seller, setSeller] = React.useState<SellerUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const fetchSeller = React.useCallback(async () => {
    if (!sellerId) return;
    setIsLoading(true)
    try {
      const userDocRef = doc(db, "users", sellerId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.dob && data.dob instanceof Timestamp) {
            data.dob = data.dob.toDate();
        }
        if (data.createdAt && data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate();
        }
        setSeller({ id: userDoc.id, ...data } as SellerUser)
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Seller could not be found.",
        })
        router.push('/manage-seller/activation');
      }
    } catch (error) {
      console.error("Failed to fetch seller data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch seller data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [sellerId, toast, router])

  React.useEffect(() => {
    fetchSeller()
  }, [fetchSeller])
  
  const handleApprove = async () => {
    if (!sellerId) return;
    setIsUpdating(true);
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await updateDoc(sellerDocRef, { status: 'active' });
        toast({
            title: `Seller Approved`,
            description: `The seller has been successfully approved and is now active.`,
        });
        router.push('/manage-seller/list');
    } catch (error) {
        console.error("Error approving seller:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to approve seller.",
        });
    } finally {
        setIsUpdating(false);
    }
  }

  const handleReject = async () => {
    if (!sellerId) return;
    setIsUpdating(true);
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await deleteDoc(sellerDocRef);
        toast({
            title: `Seller Rejected`,
            description: `The seller application has been rejected and removed.`,
        });
        router.push('/manage-seller/activation');
    } catch (error) {
        console.error("Error rejecting seller:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reject seller.",
        });
    } finally {
        setIsUpdating(false);
    }
  }


  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!seller) {
    return null;
  }
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Seller Details</h1>
        </div>

        {seller.status === 'pending' && (
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleApprove} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Approve
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Reject
                </Button>
            </div>
        )}
        
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                             <Avatar className="h-20 w-20 border">
                                <AvatarImage src={seller.profileImage} alt={seller.name} />
                                <AvatarFallback>{getInitials(seller.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-xl">{seller.name}</p>
                                <p className="text-sm text-muted-foreground">{seller.email}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/><span>{seller.phone}</span></div>
                            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/><span>{seller.email}</span></div>
                            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/><span>DOB: {seller.dob ? format(seller.dob, "PPP") : 'N/A'}</span></div>
                             <div className="flex items-center gap-2 col-span-2"><FileText className="h-4 w-4 text-muted-foreground"/><span>{`${seller.address}, ${seller.city}, ${seller.state} - ${seller.pincode}`}</span></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Business Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border">
                                <AvatarImage src={seller.businessLogo} alt={seller.businessName} />
                                <AvatarFallback>{seller.businessName ? getInitials(seller.businessName) : 'Logo'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-xl">{seller.businessName}</p>
                                <p className="text-sm text-muted-foreground">{seller.businessType}</p>
                            </div>
                        </div>
                        <Separator/>
                        <div className="text-sm">
                            <span className="font-semibold">GSTN:</span> {seller.gstn || 'N/A'}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>KYC Documents</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium">Aadhar Card</Label>
                                <p className="text-sm text-muted-foreground font-mono mt-1">{seller.aadharNumber}</p>
                                <div className="mt-2 border rounded-lg overflow-hidden">
                                    {seller.aadharFile ? <Image src={seller.aadharFile} alt="Aadhar Card" width={150} height={100} className="w-full" /> : <p className="text-xs text-center p-4 text-muted-foreground">No file</p>}
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">PAN Card</Label>
                                <p className="text-sm text-muted-foreground font-mono mt-1">{seller.panNumber}</p>
                                 <div className="mt-2 border rounded-lg overflow-hidden">
                                    {seller.panFile ? <Image src={seller.panFile} alt="PAN Card" width={150} height={100} className="w-full" /> : <p className="text-xs text-center p-4 text-muted-foreground">No file</p>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">RERA Certificate</Label>
                            <div className="mt-2 border rounded-lg overflow-hidden">
                                {seller.reraCertificate ? <Image src={seller.reraCertificate} alt="RERA Certificate" width={300} height={200} className="w-full" /> : <p className="text-xs text-center p-4 text-muted-foreground">No file uploaded</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}
