
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
import { Separator } from "./ui/separator"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, setDoc } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import type { User } from "@/types/user"


const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

export function LoginForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const { setUser } = useUser()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
      password: "password",
    },
  })

  React.useEffect(() => {
    const setupAdmin = async () => {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (!adminEmail) {
        console.warn("Admin email is not configured in environment variables.")
        return
      }

      try {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("email", "==", adminEmail))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          console.log("Admin user not found, creating one...")
          const salt = await bcrypt.genSalt(10)
          const hashedPassword = await bcrypt.hash("password", salt)
          const adminId = generateUserId("ADM")
          const adminUserDocRef = doc(db, "users", adminId);
          await setDoc(adminUserDocRef, { 
            id: adminId,
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: adminEmail, 
            phone: '123-456-7890',
            password: hashedPassword,
            role: 'admin' 
          })
          console.log("Admin user created successfully.")
        }
      } catch (error) {
        console.error("Error setting up admin user:", error)
      }
    }

    setupAdmin()
  }, [])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", values.email))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password.",
        })
        return;
      } 
      
      const userDoc = querySnapshot.docs[0]
      const user = userDoc.data() as User
      
      const isPasswordValid = await bcrypt.compare(values.password, user.password!)
      
      if (isPasswordValid) {
        const userData = { id: userDoc.id, ...user };
        localStorage.setItem('userId', userDoc.id);
        setUser(userData); // Immediately update the user context

        toast({
            title: "Login Successful",
            description: "Welcome back! Redirecting you now.",
        })

        // Redirect logic from page.tsx
        let redirectPath = '/dashboard'; // Default
        if (user.role === 'seller') redirectPath = '/listings';
        if (user.role === 'user') redirectPath = '/listings'; // Assuming general user also goes to listings

        router.push(redirectPath)

      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password.",
        })
      }
      
    } catch (error) {
       console.error("Login error:", error);
       toast({
          variant: "destructive",
          title: "Login Error",
          description: "An unexpected error occurred. Please try again.",
        })
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div>
        <div className="text-center mb-6">
            <h1 className="text-3xl font-bold font-headline">Welcome Back!</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your dashboard.
            </p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="admin@estateflow.com" {...field} disabled={isLoading} />
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
          <Button type="submit" className="w-full mt-4" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
