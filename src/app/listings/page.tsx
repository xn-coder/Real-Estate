
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, CheckCircle, ChevronRight, Loader2, PlusCircle, Hourglass, Eye, Pencil, Trash2, Tag, Home, Star } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { generateUserId } from "@/lib/utils"
import type { PropertyType } from "@/types/resource"

export default function ListingsDashboardPage() {
  const { user } = useUser();
  const [counts, setCounts] = React.useState({ total: 0, pending: 0 })
  const [isLoading, setIsLoading] = React.useState(true)
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';


  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const propertiesCollection = collection(db, "properties");
        const totalSnapshot = await getDocs(query(propertiesCollection, where("status", "!=", "Pending Verification")));
        const pendingQuery = query(propertiesCollection, where("status", "==", "Pending Verification"));
        const pendingSnapshot = await getDocs(pendingQuery);
        setCounts({ total: totalSnapshot.size, pending: pendingSnapshot.size });
    } catch (error) {
        console.error("Error fetching property counts:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    { title: "Total Properties", count: counts.total, icon: Building, color: "text-blue-500" },
    { title: "Pending Verification", count: counts.pending, icon: Hourglass, color: "text-yellow-500", adminOnly: true },
  ].filter(card => !card.adminOnly || isAdmin);

  const dashboardItems = [
    { name: "List of All Properties", href: "/listings/list", icon: Building },
    { name: "My Properties", href: "/listings/my-properties", icon: Home },
    { name: "Pending Properties", href: "/listings/pending", icon: Hourglass, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);
  
  const adminDashboardItems = [
    { name: "List of All Properties", href: "/listings/list", icon: Building },
    { name: "My Properties", href: "/listings/my-properties", icon: Home },
    { name: "Admin View Properties", href: "/listings/admin-list", icon: Eye },
    { name: "Pending Properties", href: "/listings/pending", icon: Hourglass },
    { name: "Featured Properties", href: "/listings/featured", icon: Star },
    { name: "Manage Property Types", href: "/listings/property-types", icon: Tag },
  ]

  const finalDashboardItems = isAdmin ? adminDashboardItems : dashboardItems;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Properties</h1>
         {(isSeller || isAdmin) && (
            <Button asChild>
                <Link href="/listings/add">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Property
                </Link>
            </Button>
         )}
      </div>

       <div className="grid gap-4 md:grid-cols-2">
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
        <CardHeader>
          <CardTitle>Manage Properties</CardTitle>
          <CardDescription>View and manage all property listings.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {finalDashboardItems.map((option) => (
              <Link href={option.href} key={option.name}>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                        <option.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{option.name}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
