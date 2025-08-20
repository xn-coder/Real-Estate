

'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Upload, User as UserIcon } from "lucide-react"
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
import { collection, getDocs, doc, setDoc, query, where, Timestamp } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { uploadFile } from "@/services/file-upload-service"

const step1Schema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email(),
  phone: z.string().min(10, "Please enter a valid phone number."),
  dob: z.string().min(1, "Date of birth is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  address: z.string().min(1, "Address is required."),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(6, "Please enter a valid pincode."),
});

const step2Schema = z.object({
    businessLogo: z.any().optional(),
    businessName: z.string().min(1, "Business name is required."),
    businessType: z.string().min(1, "Business type is required."),
})

const step3Schema = z.object({
    aadharNumber: z.string().min(12, "Enter a valid Aadhar number."),
    aadharFile: z.any().refine(file => file, "Aadhar card is required."),
    panNumber: z.string().min(10, "Enter a valid PAN number."),
    panFile: z.any().refine(file => file, "PAN card is required."),
    reraNumber: z.string().optional(),
    reraCertificate: z.any().optional(),
})

const addSellerFormSchema = step1Schema
    .merge(step2Schema)
    .merge(step3Schema)
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type AddSellerForm = z.infer<typeof addSellerFormSchema>;


export default function AddSellerPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(1);
  const stepSchemas = [step1Schema, step2Schema, step3Schema];

  const form = useForm<AddSellerForm>({
    resolver: zodResolver(addSellerFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      dob: "",
      password: "",
      confirmPassword: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      businessName: "",
      businessType: "",
      aadharNumber: "",
      panNumber: "",
      reraNumber: "",
    },
    mode: "onChange",
  })
  
  const handleNextStep = async () => {
    const currentStepSchema = stepSchemas[currentStep - 1];
    const fieldsToValidate = Object.keys(currentStepSchema.shape) as (keyof AddSellerForm)[];
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
        if (currentStep === 3) {
            await form.handleSubmit(onAddSellerSubmit)();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  }

  async function onAddSellerSubmit(values: AddSellerForm) {
    setIsSubmitting(true)
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", values.email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        form.setError("email", { message: "An account with this email already exists." })
        setIsSubmitting(false)
        return;
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(values.password, salt)
      const userId = generateUserId("SEL")

      const [firstName, ...lastNameParts] = values.fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const [businessLogoUrl, aadharFileUrl, panFileUrl, reraCertificateUrl] = await Promise.all([
          values.businessLogo ? uploadFile(values.businessLogo, `users/${userId}/businessLogo.jpg`) : Promise.resolve(null),
          uploadFile(values.aadharFile, `users/${userId}/aadharFile.pdf`),
          uploadFile(values.panFile, `users/${userId}/panFile.pdf`),
          values.reraCertificate ? uploadFile(values.reraCertificate, `users/${userId}/reraCertificate.pdf`) : Promise.resolve(null),
      ]);


      await setDoc(doc(db, "users", userId), {
        id: userId,
        name: values.fullName,
        firstName: firstName,
        lastName: lastName,
        email: values.email,
        phone: values.phone,
        password: hashedPassword,
        dob: Timestamp.fromDate(new Date(values.dob)),
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        businessName: values.businessName,
        businessType: values.businessType,
        businessLogo: businessLogoUrl,
        aadharNumber: values.aadharNumber,
        panNumber: values.panNumber,
        aadharFile: aadharFileUrl,
        panFile: panFileUrl,
        reraNumber: values.reraNumber,
        reraCertificate: reraCertificateUrl,
        role: 'seller',
        status: 'pending'
      })

      toast({
        title: "Registration Submitted",
        description: "Redirecting to the activation panel.",
      })
      router.push("/manage-seller/activation");

    } catch (error) {
      console.error("Error creating seller:", error)
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
        <Button variant="outline" asChild className="mb-4">
            <Link href="/manage-seller">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Seller
            </Link>
        </Button>
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Seller Registration</CardTitle>
              <CardDescription>
                Step {currentStep} of 3: {
                    currentStep === 1 ? "Personal Details" :
                    currentStep === 2 ? "Business Details" :
                    "Document Upload"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
                     {currentStep === 1 && (
                        <div className="space-y-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Main St..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="New York" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="state" render={({ field }) => ( <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="NY" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="pincode" render={({ field }) => ( <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="10001" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="businessLogo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Business Logo</FormLabel>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-20 w-20">
                                                <AvatarImage src={
                                                    field.value
                                                    ? typeof field.value === 'string'
                                                      ? field.value
                                                      : URL.createObjectURL(field.value)
                                                    : undefined
                                                } />
                                                <AvatarFallback>Logo</AvatarFallback>
                                            </Avatar>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                           field.onChange(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="businessLogo-upload"
                                                />
                                            </FormControl>
                                            <Button type="button" onClick={() => document.getElementById('businessLogo-upload')?.click()}>
                                                <Upload className="mr-2 h-4 w-4" /> Upload
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="e.g., Acme Real Estate" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="businessType" render={({ field }) => ( <FormItem><FormLabel>Business Type</FormLabel><FormControl><Input placeholder="e.g., Real Estate Agency" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    )}
                    {currentStep === 3 && (
                         <div className="space-y-4">
                            <FormField control={form.control} name="aadharNumber" render={({ field }) => ( <FormItem><FormLabel>Aadhar Card Number</FormLabel><FormControl><Input placeholder="XXXX XXXX XXXX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="aadharFile" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Upload Aadhar Card (PDF/Image)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="panNumber" render={({ field }) => ( <FormItem><FormLabel>PAN Card Number</FormLabel><FormControl><Input placeholder="ABCDE1234F" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="panFile" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Upload PAN Card (PDF/Image)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="reraNumber" render={({ field }) => ( <FormItem> <FormLabel>RERA Number (Optional)</FormLabel> <FormControl><Input placeholder="Your RERA registration number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="reraCertificate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RERA Certificate (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                     <div className="flex justify-between w-full pt-4">
                        {currentStep > 1 ? (
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                                Previous
                            </Button>
                        ) : (
                            <div></div>
                        )}
                        <Button type="button" onClick={handleNextStep} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {currentStep === 3 ? 'Submit for Review' : 'Next'}
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  )
}
