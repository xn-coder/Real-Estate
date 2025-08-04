
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
import { ArrowRight, UserCheck, UserPlus, UserX, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"

export default function ManageSellerDashboardPage() {
  const { toast } = useToast()
  const [counts, setCounts] = React.useState({
    active: 0,
    pending: 0,
    inactive: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchCounts = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const usersCollection = collection(db, "users")
      
      const activeQuery = query(usersCollection, where("role", "==", "seller"), where("status", "==", "active"))
      const pendingQuery = query(usersCollection, where("role", "==", "seller"), where("status", "==", "pending"))
      const inactiveQuery = query(usersCollection, where("role", "==", "seller"), where("status", "==", "inactive"))

      const [activeSnapshot, pendingSnapshot, inactiveSnapshot] = await Promise.all([
        getDocs(activeQuery),
        getDocs(pendingQuery),
        getDocs(inactiveQuery),
      ]);

      setCounts({
        active: activeSnapshot.size,
        pending: pendingSnapshot.size,
        inactive: inactiveSnapshot.size,
      })

    } catch (error) {
      console.error("Error fetching seller counts:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch seller counts.",
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
      title: "Active Sellers",
      count: counts.active,
      description: "View and manage all active sellers.",
      icon: UserCheck,
      href: "/manage-seller/list",
    },
    {
      title: "Seller Activation",
      count: counts.pending,
      description: "Approve or reject new seller registrations.",
      icon: UserPlus,
      href: "/manage-seller/activation",
    },
    {
      title: "Deactivated Sellers",
      count: counts.inactive,
      description: "View and reactivate deactivated sellers.",
      icon: UserX,
      href: "/manage-seller/deactivated",
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Seller Management</h1>
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
