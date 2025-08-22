
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Eye, Loader2, PlusCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore"
import type { Message } from "@/types/message"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export default function UpdatesPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const [receivedMessages, setReceivedMessages] = React.useState<Message[]>([]);
    const [sentMessages, setSentMessages] = React.useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);
    const [selectedMessage, setSelectedMessage] = React.useState<Message | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);

    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);
    const isSeller = user?.role === 'seller';
    const isAdmin = user?.role === 'admin';
    const isCustomer = user?.role === 'customer';

    const fetchMessages = React.useCallback(async () => {
        if (!user) return;
        setIsLoadingMessages(true);
        try {
            const messagesCollection = collection(db, "messages");
            
            const recipientIdClauses: string[] = [user.id];
            if (isPartner) recipientIdClauses.push("ALL_PARTNERS");
            if (isSeller) recipientIdClauses.push("ALL_SELLERS");
            if (isAdmin) recipientIdClauses.push("ALL_ADMINS", "ALL_PARTNERS", "ALL_SELLERS");
            
            const receivedMessagesList: Message[] = [];
            const q = query(messagesCollection, where("recipientId", "in", recipientIdClauses), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
                const data = doc.data();
                receivedMessagesList.push({
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Message);
            });
            
            const uniqueReceived = Array.from(new Map(receivedMessagesList.map(m => [m.id, m])).values());
            setReceivedMessages(uniqueReceived.sort((a,b) => b.date.getTime() - a.date.getTime()));

            if (isAdmin || isSeller) {
                const sentQuery = query(messagesCollection, where("senderId", "==", user.id), orderBy("date", "desc"));
                const sentSnapshot = await getDocs(sentQuery);
                const sentList = sentSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate(),
                    } as Message
                });
                setSentMessages(sentList);
            }

        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [user, isAdmin, isPartner, isSeller]);

    React.useEffect(() => {
        if (user) {
            fetchMessages();
        }
    }, [user, fetchMessages]);

    const handleViewMessage = (message: Message) => {
        setSelectedMessage(message);
        setIsViewDialogOpen(true);
    };

    const renderTable = (messages: Message[], isSentTable = false) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{isSentTable ? "Recipient" : "Sender"}</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoadingMessages ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : messages.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No messages found.
                        </TableCell>
                    </TableRow>
                ) : (
                    messages.map((message) => (
                        <TableRow key={message.id}>
                            <TableCell className="font-medium">{isSentTable ? message.recipientName : message.senderName}</TableCell>
                            <TableCell>{message.subject}</TableCell>
                            <TableCell>{format(message.date, 'PP')}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleViewMessage(message)}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View Message</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    if (isUserLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
  
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Updates</h1>
                {(isAdmin || isSeller) && (
                    <Button asChild>
                        <Link href="/send-message">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Send Message
                        </Link>
                    </Button>
                )}
            </div>
        
        {isPartner || isCustomer ? (
            <Card>
                <CardHeader>
                <CardTitle>Inbox</CardTitle>
                <CardDescription>
                    Messages and announcements you have received.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderTable(receivedMessages)}
                </CardContent>
            </Card>
        ) : (
            <Tabs defaultValue="received">
                <TabsList>
                    <TabsTrigger value="received">Received Messages</TabsTrigger>
                    <TabsTrigger value="sent">Sent History</TabsTrigger>
                </TabsList>
                <TabsContent value="received">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inbox</CardTitle>
                            <CardDescription>
                                Messages you have received from partners, sellers, and the system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderTable(receivedMessages)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="sent">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sent Messages</CardTitle>
                            <CardDescription>
                                A history of all messages and announcements you have sent.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderTable(sentMessages, true)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        )}
         <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{selectedMessage?.subject}</DialogTitle>
                    <DialogDescription>
                        Sent on {selectedMessage?.date ? format(selectedMessage.date, 'PPP p') : ''}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex gap-4 text-sm">
                        <div className="w-1/2">
                            <p className="font-semibold">From</p>
                            <p className="text-muted-foreground">{selectedMessage?.senderName}</p>
                        </div>
                         <div className="w-1/2">
                            <p className="font-semibold">To</p>
                            <p className="text-muted-foreground">{selectedMessage?.recipientName}</p>
                        </div>
                    </div>
                    <Separator />
                    {selectedMessage && (
                        <div 
                            className="prose prose-sm dark:prose-invert max-w-none p-2 border rounded-md max-h-[50vh] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: selectedMessage.body }} 
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
        </div>
    )
}
