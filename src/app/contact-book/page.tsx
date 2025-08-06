
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
import { Loader2, Eye, MessageSquare, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import type { User } from "@/types/user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
const allUserRoles = [...partnerRoles, 'seller', 'customer'];

const ITEMS_PER_PAGE = 10;

export default function ContactBookPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [allUsers, setAllUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeFilter, setActiveFilter] = React.useState("all")


  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("role", "in", allUserRoles))
      const userSnapshot = await getDocs(q)
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      setAllUsers(userList)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch contacts.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = React.useMemo(() => {
    return allUsers.filter(user => {
        const typeMatch = activeFilter === 'all' ||
            (activeFilter === 'partners' && partnerRoles.includes(user.role)) ||
            (activeFilter === 'sellers' && user.role === 'seller') ||
            (activeFilter === 'customers' && user.role === 'customer');

        const searchMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id.toLowerCase().includes(searchTerm.toLowerCase());
        
        return typeMatch && searchMatch;
    });
  }, [allUsers, searchTerm, activeFilter])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    }
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('');
    }
    return user.role.charAt(0).toUpperCase();
  }
  
  const getProfileLink = (user: User) => {
      if(partnerRoles.includes(user.role)) return `/manage-partner/${user.id}`;
      if(user.role === 'seller') return `/manage-seller/details/${user.id}`;
      if(user.role === 'customer') return `/manage-customer/${user.id}`;
      return '#';
  }
  
   const getMessageLink = (user: User) => {
      let type;
      if (partnerRoles.includes(user.role)) type = 'to_partner';
      else if (user.role === 'seller') type = 'to_seller';
      else if (user.role === 'customer') type = 'to_customer';
      else return '#';
      
      return `/send-message?recipientId=${user.id}&type=${type}`;
   }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Contact Book</h1>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or ID..."
            className="pl-8 sm:w-full"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1);
            }}
          />
        </div>
         <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No users found.
                    </TableCell>
                </TableRow>
            ) : paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.profileImage} alt={user.name} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.id}</Badge>
                </TableCell>
                 <TableCell>
                  <Badge variant="secondary" className="capitalize">{user.role.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => router.push(getProfileLink(user))}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Profile</span>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => router.push(getMessageLink(user))}>
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
