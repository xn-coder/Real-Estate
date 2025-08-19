
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
import { Loader2, Eye, Search, Building, User as UserIcon, DollarSign, Ruler, MapPin, Sparkles, Sofa, List, ShieldCheck, Calendar as CalendarIcon, Phone, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp, where } from "firebase/firestore"
import type { Property } from "@/types/property"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Requirements will now be based on the Property type
type Requirement = Property & {
    createdAt: Date | Timestamp;
    userName: string;
    userEmail: string;
    userPhone: string;
}

export default function ManageRequirementsPage() {
  const { toast } = useToast()
  const { user } = useUser();
  const [requirements, setRequirements] = React.useState<Requirement[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRequirement, setSelectedRequirement] = React.useState<Requirement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const fetchRequirements = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true)
    try {
      const requirementsRef = collection(db, "requirements")
      let q;
      if (user.role === 'admin') {
        q = query(requirementsRef, orderBy("createdAt", "desc"))
      } else {
        q = query(requirementsRef, where("ownerId", "==", user.id), orderBy("createdAt", "desc"));
      }

      const snapshot = await getDocs(q)
      const reqList = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
        } as Requirement
      })
      setRequirements(reqList)
    } catch (error) {
      console.error("Error fetching requirements:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customer requirements.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, user])

  React.useEffect(() => {
    if(user) {
        fetchRequirements()
    }
  }, [user, fetchRequirements])

  const filteredRequirements = React.useMemo(() => {
    return requirements.filter(req =>
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.propertyCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.locality.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [requirements, searchTerm])

  const handleViewDetails = (req: Requirement) => {
    setSelectedRequirement(req)
    setIsDialogOpen(true)
  }

  const pageTitle = user?.role === 'admin' ? "Manage Customer Requirements" : "My Submitted Requirements";
  const searchPlaceholder = user?.role === 'admin' ? "Search by name, category, or location..." : "Search your requirements...";


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">{pageTitle}</h1>
      </div>
       <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {user?.role === 'admin' && <TableHead>Customer Name</TableHead>}
              <TableHead>Property Type</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRequirements.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    No requirements found.
                    </TableCell>
                </TableRow>
            ) : filteredRequirements.map((req) => (
              <TableRow key={req.id}>
                {user?.role === 'admin' && <TableCell className="font-medium">{req.userName}</TableCell>}
                <TableCell>{req.propertyCategory}</TableCell>
                <TableCell>₹{req.listingPrice.toLocaleString()}</TableCell>
                <TableCell>{req.locality}</TableCell>
                <TableCell>{format(req.createdAt, 'PPP')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(req)}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Requirement Details</DialogTitle>
          </DialogHeader>
          {selectedRequirement && (
            <div className="max-h-[70vh] overflow-y-auto space-y-6 p-1">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserIcon className="h-5 w-5"/> Submitter Details</CardTitle></CardHeader>
                    <CardContent className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                        <p><strong>Name:</strong> {selectedRequirement.userName}</p>
                        <p><strong>Email:</strong> {selectedRequirement.userEmail}</p>
                        <p><strong>Phone:</strong> {selectedRequirement.userPhone}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building className="h-5 w-5"/> Core Requirements</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Category:</strong> {selectedRequirement.propertyCategory}</p>
                        <p><strong>Location:</strong> {`${selectedRequirement.locality}, ${selectedRequirement.city}`}</p>
                        <p><strong>Price:</strong> ₹{selectedRequirement.listingPrice.toLocaleString()}</p>
                        <p><strong>Area:</strong> {selectedRequirement.builtUpArea} {selectedRequirement.unitOfMeasurement}</p>
                        <p><strong>Bedrooms:</strong> {selectedRequirement.bedrooms}</p>
                        <p><strong>Bathrooms:</strong> {selectedRequirement.bathrooms}</p>
                    </CardContent>
                </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
