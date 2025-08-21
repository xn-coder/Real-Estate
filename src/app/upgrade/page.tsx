
'use client'

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, ArrowRight, Star, Handshake } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"


const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
  customer: 'Customer',
};

const upgradePaths: Record<string, string[]> = {
  affiliate: ['super_affiliate', 'associate', 'channel'],
  super_affiliate: ['associate', 'channel'],
  associate: ['channel'],
  channel: [],
  franchisee: [],
  customer: [], // Customers have a different upgrade path
};

const planFeatures: Record<string, string[]> = {
    super_affiliate: ["Higher commission rates", "Access to premium marketing kits", "Priority support"],
    associate: ["Team building capabilities", "Advanced analytics dashboard", "Dedicated account manager"],
    channel: ["Regional exclusivity options", "Co-branded marketing materials", "Direct line to leadership"],
    franchisee: ["Full business model", "Brand usage rights", "Comprehensive training & support"],
}

const customerUpgradeSchema = z.object({
  businessName: z.string().min(1, "Business name is required."),
  reason: z.string().min(10, "Please tell us why you want to be a partner."),
});

type CustomerUpgradeFormValues = z.infer<typeof customerUpgradeSchema>;

export default function UpgradePage() {
  const { user, isLoading, fetchUser } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomerUpgradeFormValues>({
    resolver: zodResolver(customerUpgradeSchema),
    defaultValues: {
      businessName: user?.businessName || "",
      reason: "",
    },
  });

  const handleUpgradeRequest = async (values: CustomerUpgradeFormValues) => {
      if (!user) return;
      setIsSubmitting(true);
      try {
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, {
              status: "pending_upgrade",
              businessName: values.businessName,
              upgradeRequest: {
                  newRole: 'affiliate',
                  reason: values.reason,
                  requestedAt: Timestamp.now(),
              }
          });
          toast({ title: "Request Submitted", description: "Your upgrade request has been sent for approval." });
          await fetchUser(); // Refresh user data
          form.reset();
      } catch (error) {
          console.error("Error submitting upgrade request:", error);
          toast({ variant: 'destructive', title: "Error", description: "Could not submit your request."});
      } finally {
          setIsSubmitting(false);
      }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !user.role || !roleNameMapping[user.role]) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Could not determine your current plan.</p>
      </div>
    )
  }

  const currentRole = user.role;
  const isCustomer = currentRole === 'customer';
  const availableUpgrades = upgradePaths[currentRole] || [];

  if (isCustomer) {
    if (user.status === 'pending_upgrade') {
         return (
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex items-center justify-center">
                 <Card className="text-center max-w-lg">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 text-green-700 rounded-full h-16 w-16 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8"/>
                        </div>
                        <CardTitle className="pt-4">Request Submitted</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            Your request to become an Affiliate Partner is under review. We will notify you once it's approved.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Become a Partner</h1>
        </div>
        <Card className="text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full h-16 w-16 flex items-center justify-center">
                    <Handshake className="h-8 w-8"/>
                </div>
                <CardTitle className="pt-4">Join Our Partner Network</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                    Unlock new opportunities by becoming an Affiliate Partner. Gain access to exclusive tools, resources, and earning potential to grow with us.
                </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
                 <Dialog>
                    <DialogTrigger asChild>
                         <Button size="lg">
                            Upgrade to Partner
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Become an Affiliate Partner</DialogTitle>
                            <DialogDescription>Please provide a few more details to start your application.</DialogDescription>
                        </DialogHeader>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleUpgradeRequest)} className="space-y-4">
                               <FormField
                                    control={form.control}
                                    name="businessName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business/Trading Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., John Doe Properties" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Why do you want to be a partner?</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Tell us a bit about your interest in real estate..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Submit Request
                                    </Button>
                                </DialogFooter>
                            </form>
                         </Form>
                    </DialogContent>
                 </Dialog>
            </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Upgrade Your Partnership</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Current Plan</CardTitle>
          <CardDescription>This is your active partnership level.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted">
                <Star className="h-8 w-8 text-primary"/>
                <div>
                    <h3 className="text-xl font-bold">{roleNameMapping[currentRole]}</h3>
                    <p className="text-sm text-muted-foreground">Your journey with us starts here.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline mb-4">Available Upgrades</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableUpgrades.map((roleKey) => (
            <Card key={roleKey} className="flex flex-col">
              <CardHeader>
                <CardTitle>{roleNameMapping[roleKey]}</CardTitle>
                <CardDescription>Unlock new features and earning potential.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                {planFeatures[roleKey] && planFeatures[roleKey].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                    Upgrade Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          
           <Card className="flex flex-col border-dashed">
              <CardHeader>
                <CardTitle>Franchisee Partner</CardTitle>
                <CardDescription>The ultimate partnership opportunity.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                {planFeatures['franchisee'].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                    Contact Us for Details
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  )
}
