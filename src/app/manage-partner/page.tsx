
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
import { MoreHorizontal, PlusCircle, Loader2, Eye, MessageSquare, UserX } from "lucide-react"
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
  DialogTitle
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const partnerRoles = {
  'affiliate': 'Affiliate Partner',
  'super_affiliate': 'Super Affiliate Partner',
  'associate': 'Associate Partner',
  'channel': 'Channel Partner',
  'franchisee': 'Franchisee',
} as const

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

const statusColors: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive'
};


export default function ManagePartnerPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [partners, setPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null)
  const [isDeactivating, setIsDeactivating] = React.useState(false)
  const [deactivationReason, setDeactivationReason] = React.useState("")
  const [isDeactivationDialogOpen, setIsDeactivationDialogOpen] = React.useState(false)

  const fetchPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const partnerRolesKeys = Object.keys(partnerRoles);
      const q = query(usersCollection, where("role", "in", partnerRolesKeys), where("status", "==", "active"))
      const partnerSnapshot = await getDocs(q)
      const partnerList = partnerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerUser))
      setPartners(partnerList)
    } catch (error) {
      console.error("Error fetching partners:", error)
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
    fetchPartners()
  }, [fetchPartners])

  const handleDeactivateClick = (partner: PartnerUser) => {
    setSelectedPartner(partner);
    setIsDeactivationDialogOpen(true);
  };

  const handleUpdateStatus = async (status: 'suspended' | 'inactive') => {
    if (!selectedPartner || !deactivationReason.trim()) {
      toast({
          variant: "destructive",
          title: "Error",
          description: "A reason is required.",
      });
      return;
    }
    
    setIsDeactivating(true);
    try {
        const partnerDocRef = doc(db, "users", selectedPartner.id);
        await updateDoc(partnerDocRef, {
            status: status,
            deactivationReason: deactivationReason.trim(),
        });
        toast({
            title: `Partner ${status === 'suspended' ? 'Suspended' : 'Deactivated'}`,
            description: `The partner has been successfully ${status === 'suspended' ? 'suspended' : 'deactivated'}.`,
        });
        fetchPartners(); // Refresh the list
        setIsDeactivationDialogOpen(false);
        setDeactivationReason("");
        setSelectedPartner(null);
    } catch (error) {
        console.error("Error deactivating partner:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update partner status.",
        });
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Manage Partners</h1>
        <Button asChild>
            <Link href="/manage-partner/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
            </Link>
        </Button>
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
                    No active partners found.
                    </TableCell>
                </TableRow>
            ) : partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{roleNameMapping[partner.role] || partner.role}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant={statusColors[partner.status || 'active'] || 'default'} className="capitalize">
                        {partner.status || 'active'}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{partner.email}</TableCell>
                <TableCell className="hidden md:table-cell">{partner.phone}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => router.push(`/manage-partner/${partner.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/send-message?recipientId=${partner.id}&type=to_partner`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDeactivateClick(partner)} className="text-destructive">
                        <UserX className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isDeactivationDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeactivationDialogOpen(false);
            setSelectedPartner(null);
            setDeactivationReason("");
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Partner Status</DialogTitle>
            <DialogDescription>
              Suspend or deactivate {selectedPartner?.name}. Please provide a reason for this action.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for {selectedPartner?.id}</Label>
              <Textarea
                id="reason"
                placeholder="Type reason here..."
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="justify-between">
            <Button variant="outline" onClick={() => setIsDeactivationDialogOpen(false)}>Cancel</Button>
            <div className="flex gap-2">
                <Button onClick={() => handleUpdateStatus('suspended')} disabled={isDeactivating} variant="destructive">
                {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Suspend
                </Button>
                 <Button onClick={() => handleUpdateStatus('inactive')} disabled={isDeactivating} variant="destructive">
                {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deactivate
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
