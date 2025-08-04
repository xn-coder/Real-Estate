
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, UserCheck, UserPlus, UserX, Ban, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

export default function ManagePartnerDashboardPage() {
  const { toast } = useToast()
  const [counts, setCounts] = React.useState({
    active: 0,
    activation: 0,
    suspended: 0,
    deactivated: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchCounts = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const activeQuery = query(usersCollection, where("role", "in", partnerRoles), where("status", "==", "active"))
      const activationQuery = query(usersCollection, where("role", "in", partnerRoles), where("status", "==", "pending_approval"))
      const suspendedQuery = query(usersCollection, where("role", "in", partnerRoles), where("status", "==", "suspended"))
      const deactivatedQuery = query(usersCollection, where("role", "in", partnerRoles), where("status", "==", "inactive"))

      const [activeSnapshot, activationSnapshot, suspendedSnapshot, deactivatedSnapshot] = await Promise.all([
        getDocs(activeQuery),
        getDocs(activationQuery),
        getDocs(suspendedQuery),
        getDocs(deactivatedQuery),
      ]);

      setCounts({
        active: activeSnapshot.size,
        activation: activationSnapshot.size,
        suspended: suspendedSnapshot.size,
        deactivated: deactivatedSnapshot.size,
      })

    } catch (error) {
      console.error("Error fetching partner counts:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch partner counts.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const dashboardItems = [
    {
      title: "Active Partners",
      count: counts.active,
      description: "View and manage all active partners.",
      icon: UserCheck,
      href: "/manage-partner/list",
    },
    {
      title: "Partner Activation",
      count: counts.activation,
      description: "Approve or reject new partner registrations.",
      icon: UserPlus,
      href: "/manage-partner/activation",
    },
     {
      title: "Suspended Partners",
      count: counts.suspended,
      description: "Manage partners who are temporarily suspended.",
      icon: Ban,
      href: "/manage-partner/suspended",
    },
    {
      title: "Deactivated Partners",
      count: counts.deactivated,
      description: "View and reactivate deactivated partners.",
      icon: UserX,
      href: "/manage-partner/deactivated",
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Partner Management</h1>
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dashboardItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : item.count}
              </div>
              <p className="text-xs text-muted-foreground pt-1">{item.description}</p>
            </CardContent>
             <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={item.href}>
                        Manage <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
