
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
import { KeyRound, Loader2, Upload, User, Pencil } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  profileImage: z.string().url().optional().or(z.literal('')),
})

type UserProfile = z.infer<typeof formSchema>;

export default function ProfilePage() {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [user, setUser] = React.useState<UserProfile & { role?: string } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const form = useForm<UserProfile>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      profileImage: "",
    },
  })
  
  React.useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, []);

  const fetchUser = React.useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile & { role?: string };
        const profileData = {
          ...userData,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
        };
        setUser(profileData);
        form.reset(profileData);
      } else {
        toast({ variant: "destructive", title: "User not found" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to fetch user data" });
    } finally {
      setIsLoading(false);
    }
  }, [userId, form, toast]);

  React.useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue("profileImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };


  async function onSubmit(values: UserProfile) {
    if (!userId) return;
    setIsUpdating(true)
    try {
      const userDocRef = doc(db, "users", userId)
      await updateDoc(userDocRef, {
        name: `${values.firstName} ${values.lastName}`,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        profileImage: values.profileImage,
      })
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
      await fetchUser(); // Refetch user data to update the UI
      setIsDialogOpen(false); // Close the dialog
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div className="space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user?.profileImage} alt="Profile" />
                                <AvatarFallback>
                                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{user?.firstName} {user?.lastName}</CardTitle>
                                <CardDescription className="capitalize">{user?.role} Account</CardDescription>
                            </div>
                        </div>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Separator />
                         <div className="grid gap-2 text-sm">
                             <div className="grid grid-cols-2">
                                <div className="font-semibold">First Name</div>
                                <div>{user?.firstName}</div>
                            </div>
                             <Separator />
                             <div className="grid grid-cols-2">
                                <div className="font-semibold">Last Name</div>
                                <div>{user?.lastName}</div>
                            </div>
                             <Separator />
                             <div className="grid grid-cols-2">
                                <div className="font-semibold">Email</div>
                                <div className="truncate">{user?.email}</div>
                            </div>
                             <Separator />
                             <div className="grid grid-cols-2">
                                <div className="font-semibold">Phone</div>
                                <div>{user?.phone}</div>
                            </div>
                         </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Security Update</CardTitle>
                            <CardDescription>Manage your account security settings.</CardDescription>
                        </div>
                        <KeyRound className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flow-root">
                            <div className="float-left text-sm font-medium">Password</div>
                            <div className="float-right text-sm text-muted-foreground">••••••••••••••</div>
                        </div>
                        <Separator className="my-4" />
                        <div className="flow-root">
                            <div className="float-left text-sm font-medium">Addon Key</div>
                            <div className="float-right text-sm font-semibold text-primary">Active</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={form.watch("profileImage")} alt="Profile" data-ai-hint="user avatar" />
                                <AvatarFallback>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-2">
                               <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                  <Upload className="mr-2 h-4 w-4"/>
                                  Upload Image
                                </Button>
                                <Input 
                                    type="file" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                />
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John" {...field} disabled={isUpdating} />
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
                                        <Input placeholder="Doe" {...field} disabled={isUpdating} />
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
                                <Input {...field} disabled />
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
                                <Input placeholder="(123) 456-7890" {...field} disabled={isUpdating} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  )
}
