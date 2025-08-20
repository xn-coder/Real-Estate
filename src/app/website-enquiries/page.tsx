
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
import { Loader2, Mail, MessageSquare, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import type { Inquiry } from "@/types/inquiry"
import { useUser } from "@/hooks/use-user"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"

export default function WebsiteEnquiriesPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const [inquiries, setInquiries] = React.useState<Inquiry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchInquiries = React.useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const q = query(
        collection(db, "inquiries"), 
        where("partnerId", "==", user.id)
      );
      const snapshot = await getDocs(q)
      const inquiryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
      } as Inquiry))
      setInquiries(inquiryList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
    } catch (error) {
      console.error("Error fetching inquiries:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch website inquiries.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  React.useEffect(() => {
    if (user) {
        fetchInquiries()
    }
  }, [user, fetchInquiries])

  const filteredInquiries = React.useMemo(() => {
    return inquiries.filter(inquiry =>
      inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.message.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [inquiries, searchTerm])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Website Enquiries</h1>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or message..."
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
              <TableHead>From</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Received</TableHead>
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
            ) : filteredInquiries.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    You have no website inquiries.
                    </TableCell>
                </TableRow>
            ) : filteredInquiries.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <TableCell>
                    <div className="font-medium">{inquiry.name}</div>
                    <div className="text-sm text-muted-foreground">{inquiry.email}</div>
                </TableCell>
                <TableCell className="max-w-sm truncate">
                    {inquiry.message}
                </TableCell>
                <TableCell>
                    <Badge variant="outline">{formatDistanceToNow(inquiry.createdAt, { addSuffix: true })}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`mailto:${inquiry.email}?subject=RE: Inquiry from your website`}>
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Reply by Email</span>
                    </a>
                  </Button>
                   <Button variant="ghost" size="icon" asChild>
                    <a href={`https://wa.me/${inquiry.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-4 w-4" />
                         <span className="sr-only">Reply on WhatsApp</span>
                    </a>
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
