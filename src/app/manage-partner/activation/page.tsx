
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
import { Loader2, CheckCircle, XCircle, FileText, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
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
  const [pendingPartners, setPendingPartners] = React.useState<PartnerUser[]>([])
  const [reactivatedPartners, setReactivatedPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)

  const fetchPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const pendingQuery = query(usersCollection, where("paymentStatus", "==", "pending_approval"), where("status", "!=", "rejected"))
      const pendingSnapshot = await getDocs(pendingQuery)
      const pendingList = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setPendingPartners(pendingList)

      const reactivatedQuery = query(usersCollection, where("status", "==", "active"), where("reactivationReason", "!=", null))
      const reactivatedSnapshot = await getDocs(reactivatedQuery)
      const reactivatedList = reactivatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setReactivatedPartners(reactivatedList)

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

  const handleApprove = async (partnerId: string) => {
    setIsUpdating(true)
    try {
      const partnerDocRef = doc(db, "users", partnerId);
      await updateDoc(partnerDocRef, {
        status: 'active',
        paymentStatus: 'paid'
      });
      toast({
        title: "Partner Approved",
        description: "The partner has been successfully approved and activated.",
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
      setIsUpdating(false)
    }
  }

  const handleRejectClick = (partner: PartnerUser) => {
    setSelectedPartner(partner);
    setIsRejectDialogOpen(true);
  }

  const handleReject = async () => {
    if (!selectedPartner || !rejectionReason.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Rejection reason is required.",
        });
        return;
    }

    setIsUpdating(true);
    try {
        const partnerDocRef = doc(db, "users", selectedPartner.id);
        await updateDoc(partnerDocRef, {
            status: 'rejected',
            rejectionReason: rejectionReason.trim(),
        });
        toast({
            title: "Partner Rejected",
            description: "The partner registration has been rejected.",
        });
        fetchPartners();
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedPartner(null);
    } catch (error) {
        console.error("Error rejecting partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reject partner.",
        });
    } finally {
        setIsUpdating(false);
    }
  }

  const renderTable = (partners: PartnerUser[], type: 'pending' | 'reactivated') => (
     <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Role</TableHead>
              {type === 'pending' ? <TableHead>Payment Proof</TableHead> : <TableHead>Reactivation Reason</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : partners.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {type === 'pending' ? 'No partners pending approval.' : 'No recently reactivated partners.'}
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {type === 'pending' ? partner.paymentTransactionId : partner.reactivationReason}
                </TableCell>
                <TableCell>
                   {type === 'pending' ? (
                     <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                           <Link href={partner.paymentProof || ''} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" /> View Proof
                           </Link>
                       </Button>
                       <Button size="sm" onClick={() => handleApprove(partner.id)} disabled={isUpdating}>
                         <CheckCircle className="mr-2 h-4 w-4" /> Approve
                       </Button>
                       <Button size="sm" variant="destructive" onClick={() => handleRejectClick(partner)} disabled={isUpdating}>
                         <XCircle className="mr-2 h-4 w-4" /> Reject
                       </Button>
                     </div>
                   ) : (
                     <Button size="sm" variant="outline" asChild>
                         <Link href={`/manage-partner/${partner.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                         </Link>
                     </Button>
                   )}
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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Partner Activation</h1>
      </div>
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="reactivated">Recently Reactivated</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
            {renderTable(pendingPartners, 'pending')}
        </TabsContent>
        <TabsContent value="reactivated">
            {renderTable(reactivatedPartners, 'reactivated')}
        </TabsContent>
      </Tabs>


      <Dialog open={isRejectDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsRejectDialogOpen(false);
            setSelectedPartner(null);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Partner Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedPartner?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason"
                placeholder="Type reason here..." 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} disabled={isUpdating} variant="destructive">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  )
}
