
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
import { ArrowRight, UserCheck, UserPlus, UserX, Ban, Loader2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
      name: "Add New Partner",
      href: "/manage-partner/add",
      count: null,
    },
    {
      name: "Active Partners",
      href: "/manage-partner/list",
      count: counts.active,
    },
    {
      name: "Partner Activation",
      href: "/manage-partner/activation",
      count: counts.activation,
    },
     {
      name: "Suspended Partners",
      href: "/manage-partner/suspended",
      count: counts.suspended,
    },
    {
      name: "Deactivated Partners",
      href: "/manage-partner/deactivated",
      count: counts.deactivated,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Partner Management</h1>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {dashboardItems.map((option) => (
              <Link href={option.href} key={option.name}>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                  <span className="font-medium">{option.name}</span>
                  <div className="flex items-center gap-4">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                    ) : (
                        option.count !== null && (
                            <Badge variant="secondary">{option.count}</Badge>
                        )
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
