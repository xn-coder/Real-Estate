
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
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Eye, Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore"
import type { Message } from "@/types/message"

export default function UpdatesPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const [receivedMessages, setReceivedMessages] = React.useState<Message[]>([]);
    const [sentMessages, setSentMessages] = React.useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);

    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);
    const isSeller = user?.role === 'seller';
    const isAdmin = user?.role === 'admin';

    const fetchMessages = React.useCallback(async () => {
        if (!user) return;
        setIsLoadingMessages(true);
        try {
            const messagesCollection = collection(db, "messages");
            
            // Fetch received messages
            const recipientQueries = [where("recipientId", "==", user.id)];
            if (isAdmin) {
                recipientQueries.push(where("recipientId", "==", "ALL_ADMINS"));
            }
            if (isPartner) {
                recipientQueries.push(where("recipientId", "==", "ALL_PARTNERS"));
            }
            if (isSeller) {
                recipientQueries.push(where("recipientId", "==", "ALL_SELLERS"));
            }

            const receivedMessagesList: Message[] = [];
            for (const recipientQuery of recipientQueries) {
                const q = query(messagesCollection, recipientQuery, orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    receivedMessagesList.push({
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate(),
                    } as Message);
                });
            }
             // Deduplicate messages in case a user belongs to multiple groups that received the same message
            const uniqueReceived = Array.from(new Map(receivedMessagesList.map(m => [m.id, m])).values());
            setReceivedMessages(uniqueReceived.sort((a,b) => b.date.getTime() - a.date.getTime()));

            // Fetch sent messages (for admin)
            if (isAdmin) {
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
                                <Button variant="ghost" size="icon">
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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Updates</h1>
        
        {isPartner || isSeller ? (
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
        </div>
    )
}
