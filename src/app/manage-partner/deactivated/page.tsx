
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
import { MoreHorizontal, Loader2, UserCheck, MessageSquare, RotateCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function DeactivatedPartnerPage() {
  const { toast } = useToast()
  const [partners, setPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isReactivating, setIsReactivating] = React.useState(false)
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null)
  const [reactivationReason, setReactivationReason] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const fetchDeactivatedPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("status", "==", "inactive"))
      const partnerSnapshot = await getDocs(q)
      const partnerList = partnerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setPartners(partnerList)
    } catch (error) {
      console.error("Error fetching deactivated partners:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch deactivated partners.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchDeactivatedPartners()
  }, [fetchDeactivatedPartners])

  const handleReactivateClick = (partner: PartnerUser) => {
    setSelectedPartner(partner)
    setIsDialogOpen(true)
  }

  const handleReactivate = async () => {
    if (!selectedPartner || !reactivationReason.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Reactivation reason is required.",
        });
        return;
    }

    setIsReactivating(true);
    try {
        const partnerDocRef = doc(db, "users", selectedPartner.id);
        await updateDoc(partnerDocRef, {
            status: 'active',
            reactivationReason: reactivationReason.trim()
        });
        toast({
            title: "Partner Reactivated",
            description: "The partner has been successfully reactivated.",
        });
        fetchDeactivatedPartners();
        setIsDialogOpen(false);
        setReactivationReason("");
        setSelectedPartner(null);
    } catch (error) {
        console.error("Error reactivating partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reactivate partner.",
        });
    } finally {
        setIsReactivating(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Deactivated Partners</h1>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : partners.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    No deactivated partners found.
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary" className="capitalize">
                        {partner.status}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{partner.email}</TableCell>
                <TableCell className="hidden md:table-cell">{partner.phone}</TableCell>
                <TableCell>
                  <Dialog open={isDialogOpen && selectedPartner?.id === partner.id} onOpenChange={(open) => {
                      if (!open) {
                        setIsDialogOpen(false);
                        setSelectedPartner(null);
                      }
                    }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleReactivateClick(partner)}>
                          <RotateCw className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reactivate Partner</DialogTitle>
                        <DialogDescription>
                          Provide a reason for reactivating {selectedPartner?.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reason">Reactivation Reason</Label>
                          <Textarea 
                            id="reason"
                            placeholder="Type reason here..." 
                            value={reactivationReason}
                            onChange={(e) => setReactivationReason(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleReactivate} disabled={isReactivating}>
                          {isReactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Reactivate Partner
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                   </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
