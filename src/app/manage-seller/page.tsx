
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, UserPlus, UserX, Loader2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ManageSellerDashboardPage() {
  const { toast } = useToast()
  const router = useRouter()
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
    { name: "Active Sellers", href: "/manage-seller/list" },
    { name: "Seller Activation", href: "/manage-seller/activation" },
    { name: "Deactivated Sellers", href: "/manage-seller/deactivated" },
  ]
  
  const statCards = [
    { title: "Active Sellers", count: counts.active, icon: UserCheck, color: "text-green-500" },
    { title: "Pending Activation", count: counts.pending, icon: UserPlus, color: "text-yellow-500" },
    { title: "Deactivated Sellers", count: counts.inactive, icon: UserX, color: "text-red-500" },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Seller Management</h1>
        <Button asChild>
            <Link href="/manage-seller/add">
              <UserPlus className="mr-2 h-4 w-4" /> Add Seller
            </Link>
        </Button>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> : <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : stat.count}
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {dashboardItems.map((option) => (
              <Link href={option.href} key={option.name}>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                  <span className="font-medium">{option.name}</span>
                   <div className="flex items-center gap-4">
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
