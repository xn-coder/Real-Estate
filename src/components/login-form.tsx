
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
import { Input } from "./ui/input"
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
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password.",
        })
        setIsLoading(false);
        return;
      } 
      
      const userDoc = querySnapshot.docs[0]
      const user = userDoc.data() as User
      
      if (!user.password) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "This account does not have a password set.",
        });
        setIsLoading(false);
        return;
      }

      const isPasswordValid = await bcrypt.compare(values.password, user.password)
      
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
        if (user.role === 'seller') redirectPath = '/dashboard';
        if (user.role === 'customer') redirectPath = '/listings/list';
        if (user.role === 'user') redirectPath = '/listings'; // Assuming general user also goes to listings
        else if (['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role)) {
            redirectPath = '/dashboard';
        }

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
                  <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
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
