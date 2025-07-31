
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
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, PlusCircle, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { User } from "@/hooks/use-user"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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

export default function SettingsPage() {
  const { toast } = useToast()
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const form = useForm<AddAccessForm>({
    resolver: zodResolver(addAccessFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      permissions: [],
    },
  })

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      const userSnapshot = await getDocs(usersCollection)
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

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function onSubmit(values: AddAccessForm) {
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
        const userId = generateUserId("ADM")

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
        form.reset()
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
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
                        control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                            control={form.control}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Access</CardTitle>
          <CardDescription>
            Here is a list of all users with access to the platform.
          </CardDescription>
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
