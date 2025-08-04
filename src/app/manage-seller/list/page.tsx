
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, setDoc } from "firebase/firestore"
import type { User as SellerUser } from "@/types/user"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"

const statusColors: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive'
};

const addSellerFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
})

type AddSellerForm = z.infer<typeof addSellerFormSchema>;


export default function ManageSellerListPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [sellers, setSellers] = React.useState<SellerUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeactivating, setIsDeactivating] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)

  const fetchSellers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const q = query(usersCollection, where("role", "==", "seller"), where("status", "==", "active"))
      const sellerSnapshot = await getDocs(q)
      const sellerList = sellerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerUser))
      setSellers(sellerList)
    } catch (error) {
      console.error("Error fetching sellers:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch sellers.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

  const handleDeactivate = async (sellerId: string) => {
    try {
        const sellerDocRef = doc(db, "users", sellerId);
        await updateDoc(sellerDocRef, {
            status: 'inactive'
        });
        toast({
            title: "Seller Deactivated",
            description: "The seller has been moved to the deactivated list.",
        });
        fetchSellers();
    } catch (error) {
        console.error("Error deactivating seller:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to deactivate seller.",
        });
    }
  };

  const form = useForm<AddSellerForm>({
    resolver: zodResolver(addSellerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  async function onAddSellerSubmit(values: AddSellerForm) {
    setIsDeactivating(true)
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", values.email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: "An account with this email already exists.",
        })
        return;
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(values.password, salt)
      const userId = generateUserId("SEL")

      await setDoc(doc(db, "users", userId), {
        id: userId,
        name: `${values.firstName} ${values.lastName}`,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: hashedPassword,
        role: 'seller',
        status: 'active'
      })

      toast({
        title: "Seller Created",
        description: "New seller account has been created successfully.",
      })
      setIsAddDialogOpen(false);
      form.reset();
      fetchSellers();

    } catch (error) {
      console.error("Error creating seller:", error)
      toast({
        variant: "destructive",
        title: "Creation Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsDeactivating(false)
    }
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Active Sellers</h1>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Seller
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle>Add New Seller</DialogTitle>
                    <DialogDescription>
                        Create a new seller account. They will be activated immediately.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddSellerSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John" {...field} disabled={isDeactivating} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Doe" {...field} disabled={isDeactivating} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="seller@example.com" {...field} disabled={isDeactivating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                            <Input placeholder="(123) 456-7890" {...field} disabled={isDeactivating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" {...field} disabled={isDeactivating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <DialogFooter>
                        <Button type="submit" disabled={isDeactivating}>
                        {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeactivating ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seller Name</TableHead>
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
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : sellers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No active sellers found.
                    </TableCell>
                </TableRow>
            ) : sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell className="font-medium">{seller.name}</TableCell>
                <TableCell>
                    <Badge variant={statusColors[seller.status || 'active'] || 'default'} className="capitalize">
                        {seller.status || 'active'}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{seller.email}</TableCell>
                <TableCell className="hidden md:table-cell">{seller.phone}</TableCell>
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
                      <DropdownMenuItem onSelect={() => alert('View Profile page to be implemented')}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/send-message?recipientId=${seller.id}&type=to_seller`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDeactivate(seller.id)} className="text-destructive">
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
    </div>
  )
}
