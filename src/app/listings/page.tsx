
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
import { Building, CheckCircle, ChevronRight, Loader2, PlusCircle, Hourglass } from "lucide-react"
import Link from "next/link"
import { activeListings } from "@/lib/data"

export default function ListingsDashboardPage() {
  const [counts, setCounts] = React.useState({ total: 0, pending: 0 })
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    // In a real app, you'd fetch this from your database.
    // We'll simulate it with the mock data for now.
    const totalCount = activeListings.length
    const pendingCount = activeListings.filter(l => l.status === 'Pending Verification').length
    setCounts({ total: totalCount, pending: pendingCount })
    setIsLoading(false)
  }, [])

  const statCards = [
    { title: "Total Properties", count: counts.total, icon: Building, color: "text-blue-500" },
    { title: "Pending Verification", count: counts.pending, icon: Hourglass, color: "text-yellow-500" },
  ];

  const dashboardItems = [
    { name: "List of Properties", href: "/listings/list", icon: Building },
    { name: "Pending Properties", href: "/listings/pending", icon: Hourglass },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Properties</h1>
         <Button asChild>
            <Link href="/listings/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Property
            </Link>
        </Button>
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
            {dashboardItems.map((option) => (
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
