
'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Phone, Mail, MapPin, MessageSquare, Briefcase } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User as CustomerUser } from "@/types/user"
import { useParams, useRouter } from "next/navigation"

export default function CustomerProfilePage() {
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string;

  const [customer, setCustomer] = React.useState<CustomerUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchCustomer = React.useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true)
    try {
      const userDocRef = doc(db, "users", customerId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists() && userDoc.data().role === 'customer') {
        const data = userDoc.data();
        setCustomer({ id: userDoc.id, ...data } as CustomerUser)
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Customer could not be found.",
        })
        router.push('/manage-customer');
      }
    } catch (error) {
      console.error("Failed to fetch customer data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customer data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [customerId, toast, router])

  React.useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!customer) {
    return null;
  }

  const getInitials = () => {
    if (customer?.firstName && customer?.lastName) {
        return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`
    }
    if (customer?.name) {
        return customer.name.split(' ').map(n => n[0]).join('');
    }
    return 'C'
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Customer Profile</h1>
        </div>

        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border">
                    <AvatarImage src={customer.profileImage} alt={customer.name} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold">{customer.name}</h2>
                    <p className="text-muted-foreground">Customer ID: {customer.id}</p>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" size="icon">
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Send Message</span>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Contact Details</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                    <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Phone Number</div>
                            <p>{customer.phone}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Email</div>
                            <p>{customer.email}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 md:col-span-3">
                        <MapPin className="h-5 w-5 mt-1 text-muted-foreground"/>
                        <div>
                            <div className="font-semibold text-muted-foreground">Address</div>
                            <p>{`${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} - ${customer.pincode || ''}`}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Lead & Enquiry History</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Lead and enquiry history will be displayed here.</p>
            </CardContent>
        </Card>

    </div>
  )
}
