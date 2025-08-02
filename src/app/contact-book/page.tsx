
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
import { Loader2, Eye, MessageSquare, Search, ChevronLeft, ChevronRight, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const partnerRoles = [
  'affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'
];

const ITEMS_PER_PAGE = 10;

export default function ContactBookPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [partners, setPartners] = React.useState<PartnerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)

  const fetchPartners = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("role", "in", partnerRoles))
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

  const filteredPartners = React.useMemo(() => {
    return partners.filter(partner =>
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [partners, searchTerm])

  const totalPages = Math.ceil(filteredPartners.length / ITEMS_PER_PAGE);
  const paginatedPartners = filteredPartners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getInitials = (partner: PartnerUser) => {
    if (partner.firstName && partner.lastName) {
      return `${partner.firstName.charAt(0)}${partner.lastName.charAt(0)}`
    }
    if (partner.name) {
      return partner.name.split(' ').map(n => n[0]).join('');
    }
    return 'P'
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Contact Book</h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or ID..."
            className="pl-8 sm:w-[300px]"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1);
            }}
          />
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Partner ID</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : paginatedPartners.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                    No partners found.
                    </TableCell>
                </TableRow>
            ) : paginatedPartners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={partner.profileImage} alt={partner.name} />
                        <AvatarFallback>{getInitials(partner)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{partner.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{partner.id}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/manage-partner/${partner.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Profile</span>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => router.push(`/send-message?recipientId=${partner.id}&type=to_partner`)}>
                        <MessageSquare className="h-4 w-4" />
                         <span className="sr-only">Send Message</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      )}
    </div>
  )
}
