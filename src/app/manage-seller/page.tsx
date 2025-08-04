
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { ArrowRight, UserCheck, UserPlus, UserX, Loader2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
      name: "Add New Seller",
      href: "/manage-seller/add",
      count: null,
    },
    {
      name: "Active Sellers",
      href: "/manage-seller/list",
      count: counts.active,
    },
    {
      name: "Seller Activation",
      href: "/manage-seller/activation",
      count: counts.pending,
    },
    {
      name: "Deactivated Sellers",
      href: "/manage-seller/deactivated",
      count: counts.inactive,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Seller Management</h1>
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
