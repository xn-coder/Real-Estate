
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
import { Loader2, RotateCw, Eye, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import Link from "next/link"
import { Input } from "@/components/ui/input"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

export default function DeactivatedPartnerPage() {
  const { toast } = useToast()
  const [allInactivePartners, setAllInactivePartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isReactivating, setIsReactivating] = React.useState(false)
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null)
  const [reactivationReason, setReactivationReason] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchDeactivatedPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const inactiveQuery = query(usersCollection, where("status", "==", "inactive"))
      const inactiveSnapshot = await getDocs(inactiveQuery)
      const inactiveList = inactiveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setAllInactivePartners(inactiveList)

    } catch (error) {
      console.error("Error fetching deactivated partners:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch partners.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchDeactivatedPartners()
  }, [fetchDeactivatedPartners])
  
  const filteredPartners = React.useMemo(() => {
    return allInactivePartners.filter(partner => 
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allInactivePartners, searchTerm]);


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

  const renderTable = (partners: PartnerUser[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partner Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Reason for Deactivation</TableHead>
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
                    No deactivated partners found.
                  </TableCell>
              </TableRow>
          ) : partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell className="font-medium">{partner.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">{partner.deactivationReason}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                    <Link href={`/manage-partner/${partner.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReactivateClick(partner)}>
                  <RotateCw className="mr-2 h-4 w-4"/>
                  Reactivate
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Deactivated Partners</h1>
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setSelectedPartner(null);
            setReactivationReason("");
          }
        }}>
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
    </div>
  )
}
