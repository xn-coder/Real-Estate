
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
import { Loader2, CheckCircle, XCircle, ArrowLeft, Search, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
  customer: 'Customer',
};

export default function UpgradeRequestPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [requests, setRequests] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const q = query(usersCollection, where("status", "==", "pending_upgrade"))
      const snapshot = await getDocs(q)
      const requestList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setRequests(requestList)

    } catch (error) {
      console.error("Error fetching upgrade requests:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch upgrade requests.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchRequests()
  }, [fetchRequests])
  
  const filteredRequests = React.useMemo(() => {
    return requests.filter(partner => 
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);


  const handleApprove = async (partner: PartnerUser) => {
    if (!partner.upgradeRequest) return;
    setIsUpdating(partner.id);
     try {
        const partnerDocRef = doc(db, "users", partner.id);
        await updateDoc(partnerDocRef, {
            status: 'active',
            role: partner.upgradeRequest.newRole,
            upgradeRequest: null,
        });
        toast({
            title: "Upgrade Approved",
            description: `${partner.name} has been upgraded to ${roleNameMapping[partner.upgradeRequest.newRole]}.`,
        });
        fetchRequests();
    } catch (error) {
        console.error("Error approving upgrade:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to approve upgrade.",
        });
    } finally {
        setIsUpdating(null);
    }
  }

   const handleReject = async (partnerId: string) => {
    setIsUpdating(partnerId);
     try {
        await updateDoc(doc(db, "users", partnerId), {
            status: 'active', // Revert to active status
            upgradeRequest: null,
        });
        toast({
            title: "Upgrade Rejected",
            description: "The upgrade request has been rejected.",
        });
        fetchRequests();
    } catch (error) {
        console.error("Error rejecting upgrade:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reject upgrade.",
        });
    } finally {
        setIsUpdating(null);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/manage-partner">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Upgrade Requests</h1>
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
       <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Requested Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No pending upgrade requests.
                    </TableCell>
                </TableRow>
            ) : filteredRequests.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        {partner.name}
                    </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                 <TableCell>
                  <Badge>{roleNameMapping[partner.upgradeRequest?.newRole || ''] || partner.upgradeRequest?.newRole}</Badge>
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleApprove(partner)} disabled={!!isUpdating}>
                          {isUpdating === partner.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4" />}
                          <span className="ml-2">Approve</span>
                      </Button>
                       <Button size="sm" variant="destructive" onClick={() => handleReject(partner.id)} disabled={!!isUpdating}>
                          {isUpdating === partner.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />}
                           <span className="ml-2">Reject</span>
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
