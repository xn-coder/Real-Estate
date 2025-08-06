
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronRight, FileText, Video, HelpCircle, FileCheck2, Ticket } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import Link from "next/link"
import type { Resource } from "@/types/resource"
import { useUser } from "@/hooks/use-user"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SupportTicket } from "@/types/team"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"


const iconMapping = {
    article: FileText,
    video: Video,
    faq: HelpCircle,
    terms_condition: FileCheck2
};

const statusColors: Record<SupportTicket['status'], 'default' | 'secondary' | 'destructive'> = {
  'Open': 'default',
  'In Progress': 'secondary',
  'Closed': 'destructive',
};

export default function HelpAndSupportPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const [counts, setCounts] = React.useState({
    article: 0,
    video: 0,
    faq: 0,
    terms_condition: 0,
  })
  const [myTickets, setMyTickets] = React.useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);


  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const resourcesCollection = collection(db, "resources")
      const snapshot = await getDocs(resourcesCollection)
      const resourceList = snapshot.docs.map(doc => doc.data() as Resource)
      
      const newCounts = {
        article: 0,
        video: 0,
        faq: 0,
        terms_condition: 0,
      };

      resourceList.forEach(resource => {
        if (resource.contentType in newCounts) {
            newCounts[resource.contentType as keyof typeof newCounts]++;
        }
      })
      setCounts(newCounts)

      if (user) {
        const ticketsRef = collection(db, "support_tickets");
        const q = query(ticketsRef, where("userId", "==", user.id), orderBy("createdAt", "desc"));
        const ticketsSnapshot = await getDocs(q);
        const ticketsList = ticketsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
        setMyTickets(ticketsList);
      }

    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch support data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, user])

  React.useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const resourceTypes = [
    { type: 'article', title: 'Articles' },
    { type: 'video', title: 'Videos' },
    { type: 'faq', title: 'FAQs' },
    { type: 'terms_condition', title: 'Terms & Conditions' },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Help & Support</h1>
         <Button asChild>
            <Link href="/support-ticket">
                <Ticket className="mr-2 h-4 w-4" /> Raise a Ticket
            </Link>
        </Button>
      </div>

       <Tabs defaultValue="dashboard">
        <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                {resourceTypes.map((resType) => {
                    const Icon = iconMapping[resType.type as keyof typeof iconMapping];
                    return (
                        <Card key={resType.type}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{resType.title}</CardTitle>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> : <Icon className={`h-4 w-4 text-muted-foreground`} />}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : counts[resType.type as keyof typeof counts]}
                                </div>
                                <Link href={`/support/list?type=${resType.type}`} className="text-xs text-muted-foreground flex items-center hover:underline">
                                    View All <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </TabsContent>
        <TabsContent value="tickets">
            <Card>
                <CardHeader>
                    <CardTitle>My Submitted Tickets</CardTitle>
                    <CardDescription>Track the status of your support requests.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : myTickets.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">You haven't submitted any tickets yet.</TableCell></TableRow>
                                ) : (
                                    myTickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-medium">{ticket.subject}</TableCell>
                                            <TableCell><Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge></TableCell>
                                            <TableCell>{format(ticket.updatedAt.toDate(), "PPP")}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => { setSelectedTicket(ticket); setIsViewDialogOpen(true); }}>
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
       </Tabs>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{selectedTicket?.subject}</DialogTitle>
                    <DialogDescription>
                        Ticket Status: <Badge variant={selectedTicket ? statusColors[selectedTicket.status] : 'default'}>{selectedTicket?.status}</Badge>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="p-4 border rounded-md bg-muted text-sm">
                        <p className="font-semibold mb-2">Your Original Request:</p>
                        <p>{selectedTicket?.description}</p>
                         <p className="text-xs text-muted-foreground mt-2">
                            Related to: {selectedTicket?.category} - {selectedTicket?.itemTitle || 'N/A'}
                        </p>
                    </div>
                    <Separator />
                    <div className="p-4 border rounded-md text-sm">
                        <p className="font-semibold mb-2">Resolution / Response from Support:</p>
                        {selectedTicket?.resolutionDetails ? (
                            <p>{selectedTicket.resolutionDetails}</p>
                        ) : (
                            <p className="text-muted-foreground">No response from support yet.</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
