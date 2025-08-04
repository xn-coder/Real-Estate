
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
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import Image from "next/image"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const step1Schema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  dob: z.string().min(1, "Date of birth is required."),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string(),
  address: z.string().min(1, "Address is required."),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(6, "Please enter a valid pincode."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const step2Schema = z.object({
    aadharNumber: z.string().min(12, "Enter a valid Aadhar number."),
    aadharFile: z.any().refine(file => file, "Aadhar card is required."),
    panNumber: z.string().min(10, "Enter a valid PAN number."),
    panFile: z.any().refine(file => file, "PAN card is required."),
    reraCertificate: z.any().optional(),
})

const combinedSchema = step1Schema.merge(step2Schema);

type SellerRegistrationForm = z.infer<typeof combinedSchema>;

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


export default function SellerRegistrationPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(1);
  
  const stepSchemas = [step1Schema, step2Schema];

  const form = useForm<SellerRegistrationForm>({
    resolver: zodResolver(combinedSchema),
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
      aadharNumber: "",
      panNumber: "",
    },
    mode: "onChange",
  })

  async function onSubmit(values: SellerRegistrationForm) {
    setIsLoading(true)
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", values.email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "An account with this email already exists.",
        })
        setIsLoading(false)
        return;
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(values.password, salt)
      const userId = generateUserId("SEL")

      const [firstName, ...lastNameParts] = values.fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      await setDoc(doc(db, "users", userId), {
        id: userId,
        name: values.fullName,
        firstName: firstName,
        lastName: lastName,
        email: values.email,
        phone: values.phone,
        password: hashedPassword,
        dob: new Date(values.dob),
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        aadharNumber: values.aadharNumber,
        panNumber: values.panNumber,
        aadharFile: values.aadharFile ? await fileToDataUrl(values.aadharFile) : '',
        panFile: values.panFile ? await fileToDataUrl(values.panFile) : '',
        reraCertificate: values.reraCertificate ? await fileToDataUrl(values.reraCertificate) : '',
        role: 'seller',
        status: 'pending'
      })

      toast({
        title: "Registration Submitted",
        description: "Your seller account is under review. You will be notified upon activation.",
      })
      router.push("/")

    } catch (error) {
      console.error("Error creating seller:", error)
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextStep = async () => {
    const currentStepSchema = stepSchemas[currentStep - 1];
    const fieldsToValidate = Object.keys(currentStepSchema.shape) as (keyof SellerRegistrationForm)[];
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      if (currentStep === 2) {
        await form.handleSubmit(onSubmit)();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="max-w-xl w-full">
        <CardHeader className="text-center">
           <Link href="/" className="mx-auto">
            <Image 
              src="/logo-name.png" 
              alt="DealFlow" 
              width={180} 
              height={40}
              className="mx-auto"
            />
          </Link>
          <CardTitle className="text-2xl font-bold font-headline mt-4">Register as a Seller</CardTitle>
          <CardDescription>
            Step {currentStep} of 2: {currentStep === 1 ? 'Personal Details' : 'Document Upload'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
                {currentStep === 1 && (
                    <div className="space-y-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input placeholder="John Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                        <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem> <FormLabel>Date of Birth</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem> <FormLabel>Confirm Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Address</FormLabel> <FormControl><Textarea placeholder="123 Main St..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <div className="grid grid-cols-3 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input placeholder="New York" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="state" render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input placeholder="NY" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="pincode" render={({ field }) => ( <FormItem> <FormLabel>Pincode</FormLabel> <FormControl><Input placeholder="10001" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                    </div>
                )}
                {currentStep === 2 && (
                    <div className="space-y-4">
                        <FormField control={form.control} name="aadharNumber" render={({ field }) => ( <FormItem> <FormLabel>Aadhar Card Number</FormLabel> <FormControl><Input placeholder="XXXX XXXX XXXX" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="aadharFile" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Upload Aadhar Card (PDF/Image)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="panNumber" render={({ field }) => ( <FormItem> <FormLabel>PAN Card Number</FormLabel> <FormControl><Input placeholder="ABCDE1234F" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="panFile" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Upload PAN Card (PDF/Image)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
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
                <div className="flex justify-between items-center pt-4">
                    {currentStep > 1 ? (
                        <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isLoading}>
                            Previous
                        </Button>
                    ) : (
                        <div></div>
                    )}
                    <Button type="button" onClick={handleNextStep} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {currentStep === 1 ? 'Next' : 'Submit for Review'}
                    </Button>
                </div>
            </form>
            </Form>
             <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}

    
