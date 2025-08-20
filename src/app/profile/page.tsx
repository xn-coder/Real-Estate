
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
import { KeyRound, Loader2, Upload, Pencil, User as UserIcon, Calendar, GraduationCap, Info, BadgeCheck, FileText, Briefcase } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import bcrypt from "bcryptjs"
import { useUser } from "@/hooks/use-user"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { generateUserId } from "@/lib/utils"

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const profileFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  profileImage: z.any().optional(),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  qualification: z.string().optional(),
})

type UserProfileForm = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
})

type PasswordForm = z.infer<typeof passwordFormSchema>;

const businessFormSchema = z.object({
  businessName: z.string().min(1, { message: "Business name is required." }),
  businessLogo: z.any().optional(),
});

type BusinessForm = z.infer<typeof businessFormSchema>;


type KycDocument = {
    type: 'Aadhar' | 'PAN';
    number: string;
    fileUrl: string;
};


export default function ProfilePage() {
  const { toast } = useToast()
  const { user, isLoading: isUserLoading, fetchUser } = useUser();
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isBusinessUpdating, setIsBusinessUpdating] = React.useState(false)
  const profileImageInputRef = React.useRef<HTMLInputElement>(null)
  const businessLogoInputRef = React.useRef<HTMLInputElement>(null)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = React.useState(false);
  const [isKycDialogOpen, setIsKycDialogOpen] = React.useState(false);
  const [selectedKycDoc, setSelectedKycDoc] = React.useState<KycDocument | null>(null);
  const [isPasswordUpdating, setIsPasswordUpdating] = React.useState(false)

  const profileForm = useForm<UserProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      profileImage: "",
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    }
  });

  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
        businessName: "",
        businessLogo: "",
    }
  });
  
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
        dob: user.dob ? format(user.dob, 'yyyy-MM-dd') : '',
        gender: user.gender,
        qualification: user.qualification
      });
      
      businessForm.reset({
          businessName: user.businessName || '',
          businessLogo: user.businessLogo || '',
      });
    }
  }, [user, profileForm, businessForm]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: "profileImage" | "businessLogo", formInstance: typeof profileForm | typeof businessForm) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64String = await fileToDataUrl(file);
      formInstance.setValue(fieldName, base64String, { shouldValidate: true });
    }
  };


  async function onProfileSubmit(values: UserProfileForm) {
    if (!user?.id) return;
    setIsUpdating(true)
    try {
      const userDocRef = doc(db, "users", user.id);
      
      let profileImageId = user.profileImageId;
      if (values.profileImage && typeof values.profileImage === 'string' && values.profileImage.startsWith('data:image')) {
          profileImageId = user.profileImageId || generateUserId('FILE');
          await setDoc(doc(db, 'files', profileImageId), { data: values.profileImage });
      }

      await updateDoc(userDocRef, {
        name: `${values.firstName} ${values.lastName}`,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        profileImageId: profileImageId,
        dob: values.dob ? new Date(values.dob) : null,
        gender: values.gender,
        qualification: values.qualification,
      })
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
      await fetchUser(); // Refetch user data to update the UI
      setIsProfileDialogOpen(false); // Close the dialog
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

  async function onBusinessSubmit(values: BusinessForm) {
    if (!user?.id) return;
    setIsBusinessUpdating(true);
    try {
        const userDocRef = doc(db, "users", user.id);

        let businessLogoId = user.businessLogoId;
        if (values.businessLogo && typeof values.businessLogo === 'string' && values.businessLogo.startsWith('data:image')) {
            businessLogoId = user.businessLogoId || generateUserId('FILE');
            await setDoc(doc(db, 'files', businessLogoId), { data: values.businessLogo });
        }

        await updateDoc(userDocRef, {
            businessName: values.businessName,
            businessLogoId: businessLogoId,
        });
        toast({
            title: "Business Profile Updated",
            description: "Your business details have been updated.",
        });
        await fetchUser();
        setIsBusinessDialogOpen(false);
    } catch(error) {
        console.error("Error updating business profile:", error);
        toast({
            variant: "destructive",
            title: "Update Error",
            description: "Failed to update business details.",
        });
    } finally {
        setIsBusinessUpdating(false);
    }
  }

  async function onPasswordResetSubmit(values: PasswordForm) {
    if (!user?.id) return
    setIsPasswordUpdating(true)
    try {
      const userDocRef = doc(db, "users", user.id)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        toast({ variant: "destructive", title: "User not found" })
        return
      }
      
      const userData = userDoc.data()
      const isPasswordValid = await bcrypt.compare(values.currentPassword, userData.password)

      if (!isPasswordValid) {
        passwordForm.setError("currentPassword", { type: "manual", message: "Incorrect current password." })
        return
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(values.newPassword, salt)

      await updateDoc(userDocRef, {
        password: hashedPassword,
      })

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      })
      setIsPasswordDialogOpen(false)
      passwordForm.reset()

    } catch (error) {
       console.error("Error updating password:", error)
       toast({
        variant: "destructive",
        title: "Update Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsPasswordUpdating(false)
    }
  }

  const handleViewKyc = (docType: 'Aadhar' | 'PAN') => {
    if (!user) return;
    const docData: KycDocument = {
        type: docType,
        number: (docType === 'Aadhar' ? user.aadharNumber : user.panNumber) || 'N/A',
        fileUrl: (docType === 'Aadhar' ? user.aadharFile : user.panFile) || '',
    };
    setSelectedKycDoc(docData);
    setIsKycDialogOpen(true);
  }

  if (isUserLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);
  const isBusinessUser = user?.role === 'admin' || user?.role === 'seller';

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.profileImage} alt="Profile" />
              <AvatarFallback>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{user?.name}</CardTitle>
              {user?.id && <CardDescription>User ID: {user.id}</CardDescription>}
            </div>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Profile</span>
              </Button>
            </DialogTrigger>
          </CardHeader>
        </Card>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileForm.watch("profileImage")} alt="Profile" data-ai-hint="user avatar" />
                  <AvatarFallback>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-2">
                  <Button type="button" variant="outline" onClick={() => profileImageInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                  <Input
                    type="file"
                    className="hidden"
                    ref={profileImageInputRef}
                    onChange={(e) => handleImageUpload(e, "profileImage", profileForm)}
                    accept="image/*"
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={profileForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={profileForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem>)} />
              {isPartner && (
                <>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="dob" render={({ field }) => ( <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={profileForm.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Gender</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger></FormControl> <SelectContent> <SelectItem value="male">Male</SelectItem> <SelectItem value="female">Female</SelectItem> <SelectItem value="other">Other</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                </div>
                <FormField control={profileForm.control} name="qualification" render={({ field }) => ( <FormItem> <FormLabel>Qualification</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select qualification"/></SelectTrigger></FormControl> <SelectContent> <SelectItem value="post-graduate">Post Graduate</SelectItem> <SelectItem value="graduate">Graduate</SelectItem> <SelectItem value="undergraduate">Undergraduate</SelectItem> <SelectItem value="diploma">Diploma</SelectItem> <SelectItem value="12th">12th</SelectItem> <SelectItem value="10th">10th</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                </>
              )}
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

      {isBusinessUser && (
        <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Business Profile</CardTitle>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4"/>Edit</Button>
                </DialogTrigger>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border">
                        <AvatarImage src={user?.businessLogo} />
                        <AvatarFallback>Logo</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user?.businessName || 'Not Set'}</p>
                        <p className="text-sm text-muted-foreground">{user?.businessType || 'Type not set'}</p>
                    </div>
                </div>
            </CardContent>
            </Card>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Business Profile</DialogTitle>
                </DialogHeader>
                <Form {...businessForm}>
                    <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-4">
                        <FormField
                            control={businessForm.control}
                            name="businessName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Business Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={isBusinessUpdating} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={businessForm.control}
                            name="businessLogo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Business Logo</FormLabel>
                                     <div className="flex items-center gap-6">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={businessForm.watch("businessLogo")} />
                                            <AvatarFallback>Logo</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-2">
                                            <Button type="button" variant="outline" onClick={() => businessLogoInputRef.current?.click()}>
                                                <Upload className="mr-2 h-4 w-4" /> Upload
                                            </Button>
                                            <Input
                                                type="file"
                                                className="hidden"
                                                ref={businessLogoInputRef}
                                                onChange={(e) => handleImageUpload(e, "businessLogo", businessForm)}
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isBusinessUpdating}>
                            {isBusinessUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Business Info
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {isPartner ? (
            <Card>
                <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center"><UserIcon className="h-5 w-5 mr-3 text-muted-foreground" /> <span>{user?.name || 'N/A'}</span></div>
                    <div className="flex items-center"><Calendar className="h-5 w-5 mr-3 text-muted-foreground" /> <span>{user?.dob ? format(user.dob, 'PPP') : 'N/A'}</span></div>
                    <div className="flex items-center capitalize"><Info className="h-5 w-5 mr-3 text-muted-foreground" /> <span>{user?.gender || 'N/A'}</span></div>
                    <div className="flex items-center"><GraduationCap className="h-5 w-5 mr-3 text-muted-foreground" /> <span>{user?.qualification || 'N/A'}</span></div>
                </CardContent>
            </Card>
        ) : !isBusinessUser ? <div /> : null }

        {isPartner && (
            <Card>
                <CardHeader>
                    <CardTitle>KYC Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span>Aadhar Card</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewKyc('Aadhar')}>View</Button>
                    </div>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span>PAN Card</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewKyc('PAN')}>View</Button>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="font-medium">Status</span>
                        <Badge variant={user?.kycStatus === 'verified' ? 'default' : 'secondary'} className="bg-green-100 text-green-800">
                            <BadgeCheck className="mr-1 h-4 w-4"/>
                            Verified
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <Card>
          <CardHeader>
            <CardTitle>Security Update</CardTitle>
            <CardDescription>Manage your account security settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center"><KeyRound className="h-5 w-5 mr-3 text-muted-foreground" />Password</div>
              <DialogTrigger asChild>
                <Button variant="outline">Reset Password</Button>
              </DialogTrigger>
            </div>
          </CardContent>
        </Card>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your current and new password below.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordResetSubmit)} className="space-y-4">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} disabled={isPasswordUpdating} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} disabled={isPasswordUpdating} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} disabled={isPasswordUpdating} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="submit" disabled={isPasswordUpdating}>
                  {isPasswordUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPasswordUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedKycDoc?.type} Card Details</DialogTitle>
            </DialogHeader>
            {selectedKycDoc && (
                <div className="space-y-4">
                    <div>
                        <Label>Document Number</Label>
                        <p className="text-sm font-mono p-2 bg-muted rounded-md">{selectedKycDoc.number}</p>
                    </div>
                    <div>
                        <Label>Uploaded Document</Label>
                        <div className="mt-2 border rounded-md p-2">
                            {selectedKycDoc.fileUrl ? (
                                <Image 
                                    src={selectedKycDoc.fileUrl} 
                                    alt={`${selectedKycDoc.type} Document`}
                                    width={400} 
                                    height={250} 
                                    className="rounded-md w-full object-contain"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">No document uploaded.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsKycDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

    