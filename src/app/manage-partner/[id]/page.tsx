
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { KeyRound, Loader2, Upload, Pencil, User as UserIcon, ArrowLeft, Building, Briefcase, FileText, Landmark, MessageSquare, UserX, Phone, Mail, UserRound, BarChart, DollarSign, Star, MapPin, AtSign, Smartphone, Users, FileQuestion, ChevronRight, Eye } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, collection, query, getDocs, Timestamp } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@/types/user"
import type { UserDocument } from "@/types/document"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"
import { useUser } from "@/hooks/use-user"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"


const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

const salesStats = [
    { icon: BarChart, label: "Total Enquiries", value: "150", color: "text-blue-500" },
    { icon: UserRound, label: "Total Customers", value: "32", color: "text-green-500" },
    { icon: DollarSign, label: "Total Revenue", value: "₹12,500", color: "text-yellow-500" },
    { icon: Star, label: "Reward Points", value: "1,200", color: "text-purple-500" },
]

export default function PartnerProfilePage() {
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const { user: adminUser } = useUser();
  const partnerId = params.id as string;

  const [partner, setPartner] = React.useState<User | null>(null)
  const [documents, setDocuments] = React.useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true);

  const fetchPartnerData = React.useCallback(async () => {
    if (!partnerId) return;
    setIsLoading(true)
    setIsLoadingDocs(true)
    try {
      // Fetch partner data
      const userDocRef = doc(db, "users", partnerId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.dob && data.dob instanceof Timestamp) {
            data.dob = data.dob.toDate();
        }
        if (data.createdAt && data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate();
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

      // Fetch partner documents if admin
      if(adminUser?.role === 'admin') {
          const docsRef = collection(db, `users/${partnerId}/documents`);
          const q = query(docsRef);
          const snapshot = await getDocs(q);
          const docsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserDocument));
          setDocuments(docsList);
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
      setIsLoadingDocs(false)
    }
  }, [partnerId, toast, router, adminUser?.role])

  React.useEffect(() => {
    if(adminUser) { // ensure adminUser is loaded before fetching
        fetchPartnerData()
    }
  }, [fetchPartnerData, adminUser])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Partner Profile</h1>
        </div>

        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border">
                    <AvatarImage src={partner.profileImage} alt={partner.name} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold">{partner.name}</h2>
                    <p className="text-muted-foreground">Partner ID: {partner.id}</p>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" size="icon">
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Send Message</span>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Partner Sales</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {salesStats.map(stat => (
                         <div key={stat.label} className="p-4 rounded-lg bg-muted flex flex-col items-center justify-center">
                             <stat.icon className={`h-8 w-8 mb-2 ${stat.color}`}/>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Contact Details</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                    <div className="flex items-start gap-3">
                        <UserIcon className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Name</div>
                            <p>{partner.name}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Phone Number</div>
                            <p>{partner.phone}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <AtSign className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Email</div>
                            <p>{partner.email}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Smartphone className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">WhatsApp No.</div>
                            <p>{partner.whatsappNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Address</div>
                            <p>{`${partner.address}, ${partner.city}, ${partner.state} - ${partner.pincode}`}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {adminUser?.role === 'admin' && (
            <>
                <Card>
                    <CardHeader><CardTitle>KYC Documents</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium">Aadhar Card</Label>
                                <p className="text-sm text-muted-foreground font-mono mt-1">{partner.aadharNumber || 'Not Provided'}</p>
                                <div className="mt-2 border rounded-lg overflow-hidden">
                                    {partner.aadharFile ? <Image src={partner.aadharFile} alt="Aadhar Card" width={150} height={100} className="w-full" /> : <p className="text-xs text-center p-4 text-muted-foreground">No file</p>}
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">PAN Card</Label>
                                <p className="text-sm text-muted-foreground font-mono mt-1">{partner.panNumber || 'Not Provided'}</p>
                                 <div className="mt-2 border rounded-lg overflow-hidden">
                                    {partner.panFile ? <Image src={partner.panFile} alt="PAN Card" width={150} height={100} className="w-full" /> : <p className="text-xs text-center p-4 text-muted-foreground">No file</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Other Uploaded Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>File Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingDocs ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : documents.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No other documents found.</TableCell></TableRow>
                                ) : (
                                    documents.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{doc.title}</TableCell>
                                            <TableCell className="text-muted-foreground">{doc.fileName}</TableCell>
                                            <TableCell className="text-right">
                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
            </>
        )}

        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:bg-muted transition-colors cursor-pointer">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-medium">Send Message</span>
                        <Mail className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                </Card>
                 <Card className="hover:bg-muted transition-colors cursor-pointer">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-medium">WhatsApp</span>
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                </Card>
                 <Card className="hover:bg-muted transition-colors cursor-pointer">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-medium">Call Now</span>
                        <Phone className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors">
                        <span className="font-medium">View Enquiry</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Separator />
                    <Link href={`/manage-customer?partnerId=${partner.id}`} className="block">
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors">
                            <span className="font-medium">Manage Customer</span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
