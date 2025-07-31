
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs, doc, setDoc } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import Image from "next/image"

const partnerRoles = {
  'affiliate': 'PAF',
  'super_affiliate': 'PSF',
  'associate': 'PAS',
  'channel': 'PCH',
  'franchisee': 'PFR',
} as const

type PartnerRole = keyof typeof partnerRoles;

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(Object.keys(partnerRoles) as [PartnerRole, ...PartnerRole[]], {
    errorMap: () => ({ message: "Please select a partner type." }),
  }),
})

export default function PartnerRegistrationPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        return;
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(values.password, salt)
      const prefix = partnerRoles[values.role]
      const userId = generateUserId(prefix)
      
      await setDoc(doc(db, "users", userId), {
        id: userId,
        name: values.name,
        email: values.email,
        password: hashedPassword,
        role: values.role,
      })

      toast({
        title: "Registration Successful",
        description: "Your partner account has been created. Please log in.",
      })
      router.push("/")

    } catch (error) {
       console.error("Error creating partner:", error)
       toast({
          variant: "destructive",
          title: "Registration Error",
          description: "An unexpected error occurred. Please try again.",
        })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="max-w-md w-full p-8 space-y-6 bg-background rounded-lg shadow-lg">
        <div className="text-center">
           <Link href="/">
            <Image 
              src="/logo-name.png" 
              alt="DealFlow" 
              width={180} 
              height={40}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold font-headline mt-4">Become a Partner</h1>
          <p className="text-muted-foreground">
            Join our network to grow your business.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} disabled={isLoading} />
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
                    <Input type="password" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a partner type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate Partner</SelectItem>
                      <SelectItem value="super_affiliate">Super Affiliate Partner</SelectItem>
                      <SelectItem value="associate">Associate Partner</SelectItem>
                      <SelectItem value="channel">Channel Partner</SelectItem>
                      <SelectItem value="franchisee">Franchisee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
