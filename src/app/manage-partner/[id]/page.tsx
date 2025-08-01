
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { KeyRound, Loader2, Upload, Pencil, User as UserIcon, ArrowLeft, Building, Briefcase, FileText, Landmark, MessageSquare, UserX } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@/types/user"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function PartnerProfilePage() {
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string;

  const [partner, setPartner] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchPartner = React.useCallback(async () => {
    if (!partnerId) return;
    setIsLoading(true)
    try {
      const userDocRef = doc(db, "users", partnerId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.dob && data.dob.toDate) {
          data.dob = data.dob.toDate();
        }
        setPartner({ id: userDoc.id, ...data } as User)
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Partner could not be found.",
        })
        router.push('/manage-partner');
      }
    } catch (error) {
      console.error("Failed to fetch partner data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch partner data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [partnerId, toast, router])

  React.useEffect(() => {
    fetchPartner()
  }, [fetchPartner])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!partner) {
    return null;
  }

  const getInitials = () => {
    if (partner?.firstName && partner?.lastName) {
        return `${partner.firstName.charAt(0)}${partner.lastName.charAt(0)}`
    }
    if (partner?.name) {
        return partner.name.split(' ').map(n => n[0]).join('');
    }
    return 'P'
  }

  const statusColor = partner.status === 'active' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/manage-partner">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Partner Profile</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                         <Avatar className="h-20 w-20 border-2 border-background ring-1 ring-ring">
                            <AvatarImage src={partner.profileImage} alt={partner.name} />
                            <AvatarFallback>{getInitials()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">{partner.name}</CardTitle>
                            <CardDescription>{roleNameMapping[partner.role] || partner.role}</CardDescription>
                            <Badge className={`mt-2 capitalize border-transparent ${statusColor}`}>
                                {partner.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm">Partner ID</h3>
                            <p className="text-sm text-muted-foreground">{partner.id}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Email</h3>
                            <p className="text-sm text-muted-foreground">{partner.email}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-sm">Phone</h3>
                            <p className="text-sm text-muted-foreground">{partner.phone}</p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message
                            </Button>
                             <Button size="sm" variant="destructive">
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Briefcase className="h-5 w-5"/>
                            Business Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                       <div className="flex justify-center mb-4">
                         {partner.businessLogo ? (
                            <Image src={partner.businessLogo} alt="Business Logo" width={100} height={100} className="rounded-md object-contain"/>
                         ) : (
                            <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                No Logo
                            </div>
                         )}
                       </div>
                       <p><strong className="font-medium">Type:</strong> {partner.businessType}</p>
                       {partner.gstn && <p><strong className="font-medium">GSTN:</strong> {partner.gstn}</p>}
                       <p><strong className="font-medium">Age:</strong> {partner.businessAge} years</p>
                       <p><strong className="font-medium">Area Covered:</strong> {partner.areaCovered}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-xl">
                            <UserIcon className="h-5 w-5"/>
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <p><strong className="font-medium block">Full Name:</strong> {partner.name}</p>
                        <p><strong className="font-medium block">Date of Birth:</strong> {partner.dob ? new Date(partner.dob).toLocaleDateString() : 'N/A'}</p>
                        <p><strong className="font-medium block">Gender:</strong> <span className="capitalize">{partner.gender}</span></p>
                        <p><strong className="font-medium block">Qualification:</strong> {partner.qualification}</p>
                        <p className="md:col-span-2"><strong className="font-medium block">Address:</strong> {`${partner.address}, ${partner.city}, ${partner.state} - ${partner.pincode}`}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="h-5 w-5"/>
                            KYC Documents
                        </CardTitle>
                    </CardHeader>
                     <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div>
                            <p><strong className="font-medium">Aadhar Number:</strong> {partner.aadharNumber}</p>
                             {partner.aadharFile && (
                                <Button variant="link" asChild className="p-0 h-auto">
                                    <a href={partner.aadharFile} target="_blank" rel="noopener noreferrer">View Aadhar Card</a>
                                </Button>
                             )}
                        </div>
                        <div>
                            <p><strong className="font-medium">PAN Number:</strong> {partner.panNumber}</p>
                            {partner.panFile && (
                                <Button variant="link" asChild className="p-0 h-auto">
                                     <a href={partner.panFile} target="_blank" rel="noopener noreferrer">View PAN Card</a>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-xl">
                            <Landmark className="h-5 w-5"/>
                            Payment Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                           <strong className="font-medium">Status:</strong>
                           <Badge variant={partner.paymentStatus === 'paid' ? 'default' : 'secondary'} className="capitalize">{partner.paymentStatus?.replace('_', ' ')}</Badge>
                        </div>
                        {partner.paymentTransactionId && <p><strong className="font-medium">Transaction ID:</strong> {partner.paymentTransactionId}</p>}
                        {partner.paymentProof && (
                             <Button variant="link" asChild className="p-0 h-auto">
                                 <a href={partner.paymentProof} target="_blank" rel="noopener noreferrer">View Payment Proof</a>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}
