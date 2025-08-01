
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
import { Loader2, RotateCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function SuspendedPartnerPage() {
  const { toast } = useToast()
  const [partners, setPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchSuspendedPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("status", "==", "suspended"))
      const partnerSnapshot = await getDocs(q)
      const partnerList = partnerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setPartners(partnerList)
    } catch (error) {
      console.error("Error fetching suspended partners:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch suspended partners.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchSuspendedPartners()
  }, [fetchSuspendedPartners])

 const handleReactivate = async (partnerId: string) => {
    try {
        const partnerDocRef = doc(db, "users", partnerId);
        await updateDoc(partnerDocRef, {
            status: 'active',
            reactivationReason: `Reactivated from suspended state. Original reason: ${partners.find(p => p.id === partnerId)?.deactivationReason || 'N/A'}`
        });
        toast({
            title: "Partner Reactivated",
            description: "The partner has been successfully reactivated.",
        });
        fetchSuspendedPartners();
    } catch (error) {
        console.error("Error reactivating partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reactivate partner.",
        });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Suspended Partners</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Suspension Reason</TableHead>
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
                    No suspended partners found.
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{partner.deactivationReason}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleReactivate(partner.id)}>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Reactivate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
