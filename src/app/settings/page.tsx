
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, setDoc, query, where, updateDoc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Landmark } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import type { User } from "@/types/user"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

const permissions = [
  { id: "manageLeads", label: "Manage Leads" },
  { id: "manageDeals", label: "Manage Deals" },
  { id: "manageListings", label: "Manage Listings" },
  { id: "managePartners", label: "Manage Partners" },
  { id: "manageSellers", label: "Manage Sellers" },
  { id: "sendMessages", label: "Send Messages" },
] as const

const addAccessFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one permission.",
  }),
})

type AddAccessForm = z.infer<typeof addAccessFormSchema>

const partnerRoles = {
  'affiliate': 'Affiliate Partner',
  'super_affiliate': 'Super Affiliate Partner',
  'associate': 'Associate Partner',
  'channel': 'Channel Partner',
  'franchisee': 'Franchisee',
} as const;
type PartnerRole = keyof typeof partnerRoles;

const feesFormSchema = z.object({
  affiliate: z.coerce.number().min(0, { message: "Fee must be a positive number." }),
  super_affiliate: z.coerce.number().min(0, { message: "Fee must be a positive number." }),
  associate: z.coerce.number().min(0, { message: "Fee must be a positive number." }),
  channel: z.coerce.number().min(0, { message: "Fee must be a positive number." }),
  franchisee: z.coerce.number().min(0, { message: "Fee must be a positive number." }),
})

type FeesForm = z.infer<typeof feesFormSchema>

export default function SettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isFeesDialogOpen, setIsFeesDialogOpen] = React.useState(false)
  const [isUpdatingFees, setIsUpdatingFees] = React.useState(false)
  const [fees, setFees] = React.useState<FeesForm | null>(null)

  const accessForm = useForm<AddAccessForm>({
    resolver: zodResolver(addAccessFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      permissions: [],
    },
  })

  const feesForm = useForm<FeesForm>({
    resolver: zodResolver(feesFormSchema),
  })


  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, where("role", "==", "admin"));
      const userSnapshot = await getDocs(q);
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      setUsers(userList)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchFees = React.useCallback(async () => {
    try {
        const feesDocRef = doc(db, "app_settings", "registration_fees");
        const feesDoc = await getDoc(feesDocRef);

        if (feesDoc.exists()) {
            const feesData = feesDoc.data() as FeesForm;
            setFees(feesData);
            feesForm.reset(feesData);
        } else {
            // If not exist, set with default values
            const defaultFees: FeesForm = {
                affiliate: 0,
                super_affiliate: 200,
                associate: 300,
                channel: 400,
                franchisee: 1000,
            };
            await setDoc(feesDocRef, defaultFees);
            setFees(defaultFees);
            feesForm.reset(defaultFees);
        }
    } catch (error) {
        console.error("Error fetching fees:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch registration fees.",
        });
    }
  }, [toast, feesForm]);

  React.useEffect(() => {
    fetchUsers()
    fetchFees()
  }, [fetchUsers, fetchFees])

  async function onAccessSubmit(values: AddAccessForm) {
    setIsSubmitting(true)
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
            firstName: values.firstName,
            lastName: values.lastName,
            name: `${values.firstName} ${values.lastName}`,
            email: values.email,
            password: hashedPassword,
            role: "admin",
            permissions: values.permissions,
        })
        
        toast({
            title: "User Created",
            description: "New admin user has been created successfully.",
        })
        accessForm.reset()
        setIsDialogOpen(false)
        fetchUsers() // Refresh user list
    } catch (error) {
         console.error("Error creating user:", error)
        toast({
            variant: "destructive",
            title: "Creation Error",
            description: "An unexpected error occurred. Please try again.",
        })
    } finally {
        setIsSubmitting(false)
    }
  }

  async function onFeesSubmit(values: FeesForm) {
    setIsUpdatingFees(true)
    try {
        const feesDocRef = doc(db, "app_settings", "registration_fees");
        await updateDoc(feesDocRef, values);
        toast({
            title: "Fees Updated",
            description: "Partner registration fees updated successfully.",
        })
        setIsFeesDialogOpen(false)
        fetchFees()
    } catch (error) {
        console.error("Error updating fees:", error);
        toast({
            variant: "destructive",
            title: "Update Error",
            description: "Failed to update registration fees.",
        })
    } finally {
        setIsUpdatingFees(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
      </div>
      
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Partner Registration Fees</CardTitle>
                <CardDescription>Manage registration fees for each partner tier.</CardDescription>
            </div>
            <Dialog open={isFeesDialogOpen} onOpenChange={setIsFeesDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Fees
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                     <Form {...feesForm}>
                        <form onSubmit={feesForm.handleSubmit(onFeesSubmit)} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Edit Registration Fees</DialogTitle>
                                <DialogDescription>Update the registration fee for each partner type.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {Object.keys(partnerRoles).map((role) => (
                                     <FormField
                                        key={role}
                                        control={feesForm.control}
                                        name={role as PartnerRole}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{partnerRoles[role as PartnerRole]}</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} disabled={isUpdatingFees} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isUpdatingFees}>
                                    {isUpdatingFees && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partner Role</TableHead>
                            <TableHead className="text-right">Fee (₹)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {fees ? (
                            Object.entries(fees).map(([role, fee]) => (
                                <TableRow key={role}>
                                    <TableCell className="font-medium">{partnerRoles[role as PartnerRole]}</TableCell>
                                    <TableCell className="text-right">{fee.toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
       </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Manage Access</CardTitle>
                <CardDescription>
                    Here is a list of all users with admin access to the platform.
                </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Access
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Admin Access</DialogTitle>
                  <DialogDescription>
                    Create a new admin account with limited access features.
                  </DialogDescription>
                </DialogHeader>
                <Form {...accessForm}>
                  <form onSubmit={accessForm.handleSubmit(onAccessSubmit)} className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={accessForm.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={accessForm.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Doe" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                      control={accessForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="admin@example.com" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accessForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accessForm.control}
                      name="permissions"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Permissions</FormLabel>
                          </div>
                          <div className="space-y-2">
                            {permissions.map((item) => (
                              <FormField
                                key={item.id}
                                control={accessForm.control}
                                name="permissions"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create User
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
