
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
import { Loader2, CheckCircle, XCircle, Eye, MessageSquare, Search, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import Link from "next/link"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function PartnerActivationPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [pendingPartners, setPendingPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const pendingQuery = query(usersCollection, where("status", "==", "pending_approval"))
      const pendingSnapshot = await getDocs(pendingQuery)
      const pendingList = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setPendingPartners(pendingList)

    } catch (error) {
      console.error("Error fetching partners:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch partners for activation.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchPartners()
  }, [fetchPartners])
  
  const filteredPartners = React.useMemo(() => {
    return pendingPartners.filter(partner => 
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingPartners, searchTerm]);


  const handleApprove = async (partnerId: string) => {
    setIsUpdating(partnerId);
     try {
        const partnerDocRef = doc(db, "users", partnerId);
        await updateDoc(partnerDocRef, {
            status: 'active',
            paymentStatus: 'paid', // Assuming manual approval means payment is confirmed
        });
        toast({
            title: "Partner Approved",
            description: "The partner account has been activated.",
        });
        fetchPartners();
    } catch (error) {
        console.error("Error approving partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to approve partner.",
        });
    } finally {
        setIsUpdating(null);
    }
  }

   const handleReject = async (partnerId: string) => {
    setIsUpdating(partnerId);
     try {
        await deleteDoc(doc(db, "users", partnerId));
        toast({
            title: "Partner Rejected",
            description: "The partner registration has been rejected and removed.",
        });
        fetchPartners();
    } catch (error) {
        console.error("Error rejecting partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reject partner.",
        });
    } finally {
        setIsUpdating(null);
    }
  }


  const renderTable = (partners: PartnerUser[]) => (
     <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : partners.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No partners are currently pending activation.
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell>{partner.email}</TableCell>
                <TableCell>{partner.phone}</TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/manage-partner/${partner.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(partner.id)} disabled={!!isUpdating}>
                          {isUpdating === partner.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                       <Button size="sm" variant="destructive" onClick={() => handleReject(partner.id)} disabled={!!isUpdating}>
                          {isUpdating === partner.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />}
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/manage-partner">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Partner Activation</h1>
        </div>
      </div>
       <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            className="pl-8 sm:w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {renderTable(filteredPartners)}
    </div>
  )
}
