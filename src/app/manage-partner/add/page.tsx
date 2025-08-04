
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, PlusCircle, Loader2, Upload, CalendarIcon, User, ArrowLeft, Paperclip } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, setDoc, query, where, getDoc, updateDoc } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from 'axios';

const partnerRoles = {
  'affiliate': 'Affiliate Partner',
  'super_affiliate': 'Super Affiliate Partner',
  'associate': 'Associate Partner',
  'channel': 'Channel Partner',
  'franchisee': 'Franchisee',
} as const

type PartnerRole = keyof typeof partnerRoles;

const addPartnerFormStep1Schema = z.object({
  profileImage: z.any().optional(),
  fullName: z.string().min(1, "Full name is required."),
  dob: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["male", "female", "other"], { required_error: "Please select a gender." }),
  qualification: z.string().min(1, "Qualification is required."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  address: z.string().min(1, "Address is required."),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(6, "Please enter a valid pincode."),
});

const addPartnerFormStep2Schema = z.object({
    businessName: z.string().min(1, "Business name is required."),
    businessLogo: z.any().optional(),
    businessType: z.string().min(1, "Business type is required."),
    role: z.enum(Object.keys(partnerRoles) as [PartnerRole, ...PartnerRole[]], {
        required_error: "Please select a partner category.",
    }),
    gstn: z.string().optional(),
    businessAge: z.coerce.number().min(0, "Age must be a positive number."),
    areaCovered: z.string().min(1, "Area covered is required."),
})

const addPartnerFormStep3Schema = z.object({
    aadharNumber: z.string().min(12, "Enter a valid Aadhar number."),
    aadharFile: z.any().refine(file => file, "Aadhar card is required."),
    panNumber: z.string().min(10, "Enter a valid PAN number."),
    panFile: z.any().refine(file => file, "PAN card is required."),
})

const addPartnerFormStep4GatewaySchema = z.object({});

const addPartnerFormStep4ManualSchema = z.object({
    paymentProof: z.any().refine(file => file, "Payment proof is required."),
    transactionId: z.string().min(1, "Transaction ID is required."),
});

const isPaymentGatewayEnabled = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_ENABLED === 'true';

const stepSchemas = [
    addPartnerFormStep1Schema, 
    addPartnerFormStep2Schema, 
    addPartnerFormStep3Schema, 
    isPaymentGatewayEnabled ? addPartnerFormStep4GatewaySchema : addPartnerFormStep4ManualSchema
];

const baseCombinedSchema = addPartnerFormStep1Schema
  .merge(addPartnerFormStep2Schema)
  .merge(addPartnerFormStep3Schema);

const combinedSchema = (
  isPaymentGatewayEnabled
    ? baseCombinedSchema
    : baseCombinedSchema.merge(addPartnerFormStep4ManualSchema)
).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


type AddPartnerForm = z.infer<typeof combinedSchema>;


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


export default function AddPartnerPage() {
  const { toast } = useToast()
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(1);
  const [fees, setFees] = React.useState<Record<string, number> | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<"idle" | "processing" | "success" | "error">("idle");
  const isPaymentEnabled = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_ENABLED === 'true';

  const form = useForm<AddPartnerForm>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      dob: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      businessName: "",
      businessType: "",
      gstn: "",
      businessAge: 0,
      areaCovered: "",
      aadharNumber: "",
      panNumber: "",
      transactionId: "",
    },
    mode: "onChange"
  })

  const fetchFees = React.useCallback(async () => {
    try {
        const feesDocRef = doc(db, "app_settings", "registration_fees");
        const feesDoc = await getDoc(feesDocRef);

        if (feesDoc.exists()) {
            setFees(feesDoc.data());
        }
    } catch (error) {
        console.error("Error fetching fees:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchFees()
  }, [fetchFees])

  const handleNextStep = async () => {
    // Only trigger validation for the fields in the current step
    const currentStepSchema = stepSchemas[currentStep - 1];
    const fieldsToValidate = Object.keys(currentStepSchema.shape) as (keyof AddPartnerForm)[];
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
        if (currentStep === 4) {
            handleFinalSubmit(form.getValues());
        } else {
            setCurrentStep(prev => prev + 1);
        }
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  }

  const handleFinalSubmit = React.useCallback(async (values: AddPartnerForm) => {
    setIsSubmitting(true);
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
            setIsSubmitting(false)
            return;
        }
        
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(values.password, salt)
        const prefix = 'P' + values.role.substring(0, 2).toUpperCase();
        const userId = generateUserId(prefix);

        const partnerDataBase = {
            id: userId,
            name: values.fullName,
            firstName: values.fullName.split(' ')[0],
            lastName: values.fullName.split(' ').slice(1).join(' '),
            email: values.email,
            phone: values.phone,
            password: hashedPassword,
            role: values.role,
            status: 'active' as 'active',
            profileImage: values.profileImage ? (typeof values.profileImage === 'string' ? values.profileImage : await fileToDataUrl(values.profileImage)) : '',
            dob: new Date(values.dob),
            gender: values.gender,
            qualification: values.qualification,
            address: values.address,
            city: values.city,
            state: values.state,
            pincode: values.pincode,
            businessName: values.businessName,
            businessLogo: values.businessLogo ? (typeof values.businessLogo === 'string' ? values.businessLogo : await fileToDataUrl(values.businessLogo)) : '',
            businessType: values.businessType,
            gstn: values.gstn,
            businessAge: values.businessAge,
            areaCovered: values.areaCovered,
            aadharNumber: values.aadharNumber,
            aadharFile: values.aadharFile ? await fileToDataUrl(values.aadharFile) : '',
            panNumber: values.panNumber,
            panFile: values.panFile ? await fileToDataUrl(values.panFile) : '',
        };

        const selectedRole = form.watch("role");
        const registrationFee = selectedRole && fees ? fees[selectedRole] : 0;

        if (isPaymentEnabled && registrationFee > 0) {
            await setDoc(doc(db, "users", userId), { ...partnerDataBase, paymentStatus: 'pending' });
            await handlePayment(registrationFee, userId);
        } else if (!isPaymentEnabled && registrationFee > 0) {
             const paymentData = values as z.infer<typeof addPartnerFormStep4ManualSchema>;
             const paymentProofUrl = paymentData.paymentProof ? await fileToDataUrl(paymentData.paymentProof) : '';
            await setDoc(doc(db, "users", userId), {
                ...partnerDataBase,
                paymentStatus: 'pending_approval',
                paymentProof: paymentProofUrl,
                paymentTransactionId: paymentData.transactionId,
            });
             toast({
                title: "Registration Submitted",
                description: "Your registration is under review and will be approved shortly.",
            });
            router.push("/manage-partner");
        } else {
            await setDoc(doc(db, "users", userId), { ...partnerDataBase, paymentStatus: 'not_required' });
            toast({
                title: "Partner Created",
                description: "New partner account has been created successfully.",
            });
            router.push("/manage-partner");
        }

    } catch (error) {
        console.error("Error creating partner:", error)
        toast({
            variant: "destructive",
            title: "Creation Error",
            description: "An unexpected error occurred. Please try again.",
        })
    } finally {
        setIsSubmitting(false)
    }
  }, [toast, router, fees, isPaymentEnabled, form]);


  const handlePayment = async (amount: number, userId: string) => {
    setPaymentStatus("processing");
    try {
      const transactionId = `TX_${userId}_${Date.now()}`;
      const response = await axios.post('/api/payment/initiate', {
        amount,
        merchantTransactionId: transactionId,
        merchantUserId: userId,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/manage-partner?payment=success&tid=${transactionId}`,
      });

      if (response.data.success) {
        router.push(response.data.data.instrumentResponse.redirectInfo.url);
      } else {
        setPaymentStatus("error");
        toast({
          variant: "destructive",
          title: "Payment Initiation Failed",
          description: response.data.message || "Could not connect to payment gateway.",
        });
      }
    } catch (error) {
      console.error("Payment API error:", error);
      setPaymentStatus("error");
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: "An unexpected error occurred while initiating payment.",
      });
    }
  };


  async function onSubmit() {
    handleNextStep();
  }

  const selectedRole = form.watch("role");
  const registrationFee = selectedRole && fees ? fees[selectedRole] : 0;
  
  const paymentProofPreview = form.watch("paymentProof");


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Button variant="outline" size="icon" className="mb-4" asChild>
            <Link href="/manage-partner">
                <ArrowLeft className="h-4 w-4" />
            </Link>
        </Button>
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Add New Partner</CardTitle>
              <p className="text-muted-foreground">
                Step {currentStep} of 4: {
                    currentStep === 1 ? "Personal Details" :
                    currentStep === 2 ? "Business Details" :
                    currentStep === 3 ? "KYC Details" :
                    "Payment"
                }
              </p>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="profileImage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Profile Image</FormLabel>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-20 w-20">
                                                <AvatarImage src={
                                                    field.value
                                                    ? typeof field.value === 'string'
                                                      ? field.value
                                                      : URL.createObjectURL(field.value)
                                                    : undefined
                                                } />
                                                <AvatarFallback><User/></AvatarFallback>
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
                                                    id="profileImage-upload"
                                                />
                                            </FormControl>
                                            <Button type="button" onClick={() => document.getElementById('profileImage-upload')?.click()}>
                                                <Upload className="mr-2 h-4 w-4" /> Upload
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input placeholder="John Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dob"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date of Birth</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Gender</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger></FormControl> <SelectContent> <SelectItem value="male">Male</SelectItem> <SelectItem value="female">Female</SelectItem> <SelectItem value="other">Other</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                            </div>
                            <FormField control={form.control} name="qualification" render={({ field }) => ( <FormItem> <FormLabel>Qualification</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select qualification"/></SelectTrigger></FormControl> <SelectContent> <SelectItem value="post-graduate">Post Graduate</SelectItem> <SelectItem value="graduate">Graduate</SelectItem> <SelectItem value="undergraduate">Undergraduate</SelectItem> <SelectItem value="diploma">Diploma</SelectItem> <SelectItem value="12th">12th</SelectItem> <SelectItem value="10th">10th</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="partner@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
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
                             <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem> <FormLabel>Business Name</FormLabel> <FormControl><Input placeholder="e.g., Acme Real Estate" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="businessType" render={({ field }) => ( <FormItem> <FormLabel>Business Type</FormLabel> <FormControl><Input placeholder="e.g., Real Estate Agency" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="role" render={({ field }) => ( <FormItem> <FormLabel>Partner Category</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select a partner category"/></SelectTrigger></FormControl> <SelectContent> {Object.entries(partnerRoles).map(([key, value]) => ( <SelectItem key={key} value={key}>{value}</SelectItem> ))} </SelectContent> </Select> {selectedRole && fees && registrationFee > 0 && <FormDescription>Registration Fee: ${fees[selectedRole].toLocaleString()}</FormDescription>} <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="gstn" render={({ field }) => ( <FormItem> <FormLabel>GSTN (Optional)</FormLabel> <FormControl><Input placeholder="Your GST Number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="businessAge" render={({ field }) => ( <FormItem> <FormLabel>Age of Business (Years)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="areaCovered" render={({ field }) => ( <FormItem> <FormLabel>Area Covered</FormLabel> <FormControl><Input placeholder="e.g., Downtown, Suburbs" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                        </div>
                    )}
                    {currentStep === 3 && (
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
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="space-y-4 text-center">
                             {isPaymentEnabled && registrationFee > 0 ? (
                                <>
                                    <h3 className="text-lg font-medium">Complete Your Payment</h3>
                                    <p className="text-muted-foreground">To finalize your registration, please pay the partner fee.</p>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="text-4xl font-bold">${registrationFee?.toLocaleString()}</div>
                                            <p className="text-sm text-muted-foreground mt-1">One-time Registration Fee</p>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-medium">Submit Payment Proof</h3>
                                    <p className="text-muted-foreground mb-4">Please upload your payment proof for verification.</p>
                                    <div className="space-y-4 text-left">
                                        <FormField control={form.control} name="transactionId" render={({ field }) => ( <FormItem> <FormLabel>Transaction ID</FormLabel> <FormControl><Input placeholder="Enter the transaction ID" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={form.control} name="paymentProof" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Upload Proof (PDF/Image)</FormLabel>
                                                <FormControl>
                                                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                                </FormControl>
                                                {paymentProofPreview && (
                                                    <div className="text-sm text-muted-foreground pt-2 flex items-center gap-2">
                                                        <Paperclip className="h-4 w-4"/>
                                                        <span>{paymentProofPreview.name}</span>
                                                    </div>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        {currentStep > 1 && (
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting || paymentStatus === 'processing'}>
                                Previous
                            </Button>
                        )}
                         {currentStep < 4 && (
                            <Button type="button" onClick={handleNextStep} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Next
                            </Button>
                        )}
                         {currentStep === 4 && (
                            <Button 
                                type="button" 
                                onClick={() => handleFinalSubmit(form.getValues())}
                                disabled={paymentStatus === 'processing' || isSubmitting}
                            >
                                {(paymentStatus === 'processing' || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isPaymentEnabled && registrationFee > 0
                                    ? (isSubmitting ? 'Processing...' : `Pay $${registrationFee}`)
                                    : (isSubmitting ? 'Submitting...' : 'Finish & Submit for Review')
                                }
                            </Button>
                        )}
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  )
}
