
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
import { Eye } from "lucide-react"

const receivedMessages = [
  { id: 'msg1', senderId: 'PARTNER001', from: 'John Doe (Partner)', subject: 'New Lead Submission', date: new Date(), read: false },
  { id: 'msg2', senderId: 'SYSTEM', from: 'System Announcement', subject: 'Upcoming Platform Maintenance', date: new Date(new Date().setDate(new Date().getDate() - 1)), read: true },
  { id: 'msg3', senderId: 'SELLER001', from: 'Jane Smith (Seller)', subject: 'Question about my listing', date: new Date(new Date().setDate(new Date().getDate() - 2)), read: true },
];

const sentMessages = [
  { id: 'sent1', to: 'All Partners', subject: 'Q2 Commission Reports', date: new Date() },
  { id: 'sent2', to: 'Jane Smith (Seller)', subject: 'Re: Question about your listing', date: new Date(new Date().setDate(new Date().getDate() - 1)) },
  { id: 'sent3', to: 'Mark Johnson (Partner)', subject: 'Welcome to the team!', date: new Date(new Date().setDate(new Date().getDate() - 3)) },
];


export default function UpdatesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Updates</h1>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>Sender Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedMessages.map((message) => (
                    <TableRow key={message.id} className={!message.read ? 'bg-muted/50 font-bold' : ''}>
                      <TableCell>
                        <Badge variant="outline">{message.senderId}</Badge>
                      </TableCell>
                      <TableCell>{message.from}</TableCell>
                      <TableCell>{message.subject}</TableCell>
                      <TableCell>{format(message.date, 'PP')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Message</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sentMessages.map((message) => (
                        <TableRow key={message.id}>
                        <TableCell>{message.to}</TableCell>
                        <TableCell>{message.subject}</TableCell>
                        <TableCell className="text-right">{format(message.date, 'PP')}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
