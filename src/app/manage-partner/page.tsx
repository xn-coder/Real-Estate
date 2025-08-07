
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, UserPlus, UserX, Ban, Loader2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import ManagePartnerListPage from "./list/page"

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

export default function ManagePartnerDashboardPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const [counts, setCounts] = React.useState({
    active: 0,
    activation: 0,
    suspended: 0,
    deactivated: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';

  const fetchCounts = React.useCallback(async () => {
    if (!isAdmin) {
        setIsLoading(false);
        return;
    }
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
  }, [toast, isAdmin])

  React.useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  if (isSeller) {
    return <ManagePartnerListPage />
  }

  const dashboardItems = [
    { name: "Active Partners", href: "/manage-partner/list", count: counts.active },
    { name: "Partner Activation", href: "/manage-partner/activation", count: counts.activation, adminOnly: true },
    { name: "Suspended Partners", href: "/manage-partner/suspended", count: counts.suspended, adminOnly: true },
    { name: "Deactivated Partners", href: "/manage-partner/deactivated", count: counts.deactivated, adminOnly: true },
  ].filter(item => isSeller ? !item.adminOnly : true);

  const statCards = [
    { title: "Active Partners", count: counts.active, icon: UserCheck, color: "text-green-500" },
    { title: "Pending Activation", count: counts.activation, icon: UserPlus, color: "text-yellow-500", adminOnly: true },
    { title: "Suspended", count: counts.suspended, icon: Ban, color: "text-orange-500", adminOnly: true },
    { title: "Deactivated", count: counts.deactivated, icon: UserX, color: "text-red-500", adminOnly: true },
  ].filter(item => isSeller ? !item.adminOnly : true);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Partner Management</h1>
         {isAdmin && (
            <Button asChild>
                <Link href="/manage-partner/add">
                <UserPlus className="mr-2 h-4 w-4" /> Add Partner
                </Link>
            </Button>
         )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
