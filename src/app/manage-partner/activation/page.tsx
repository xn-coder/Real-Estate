
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
import { Loader2, CheckCircle, XCircle, Eye, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { useRouter } from "next/navigation"

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
  const [reactivatedPartners, setReactivatedPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const fetchPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const reactivatedQuery = query(usersCollection, where("status", "==", "active"), where("reactivationReason", "!=", null))
      const reactivatedSnapshot = await getDocs(reactivatedQuery)
      const reactivatedList = reactivatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setReactivatedPartners(reactivatedList)

    } catch (error) {
      console.error("Error fetching partners:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reactivated partners.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  const handleDeactivate = async (partnerId: string) => {
    setIsUpdating(true);
     try {
        const partnerDocRef = doc(db, "users", partnerId);
        await updateDoc(partnerDocRef, {
            status: 'inactive',
            reactivationReason: null, // Clear reactivation reason upon deactivation
            deactivationReason: 'Deactivated from activation panel.'
        });
        toast({
            title: "Partner Deactivated",
            description: "The partner has been moved to the deactivated list.",
        });
        fetchPartners();
    } catch (error) {
        console.error("Error deactivating partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to deactivate partner.",
        });
    } finally {
        setIsUpdating(false);
    }
  }


  const renderTable = (partners: PartnerUser[]) => (
     <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Reactivation Reason</TableHead>
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
                        No recently reactivated partners.
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {partner.reactivationReason}
                </TableCell>
                <TableCell>
                   <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/manage-partner/${partner.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button size="sm" variant="outline" disabled={isUpdating}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeactivate(partner.id)} disabled={isUpdating}>
                          <XCircle className="mr-2 h-4 w-4" /> Deactivate
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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reactivated Partners</h1>
      </div>
      {renderTable(reactivatedPartners)}
    </div>
  )
}
