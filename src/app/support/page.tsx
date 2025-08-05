
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronRight, FileText, Video, HelpCircle, FileCheck2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Link from "next/link"
import type { Resource } from "@/types/resource"

const iconMapping = {
    article: FileText,
    video: Video,
    faq: HelpCircle,
    terms_condition: FileCheck2
};

export default function HelpAndSupportPage() {
  const { toast } = useToast()
  const [counts, setCounts] = React.useState({
    article: 0,
    video: 0,
    faq: 0,
    terms_condition: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchCounts = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const resourcesCollection = collection(db, "resources")
      const snapshot = await getDocs(resourcesCollection)
      const resourceList = snapshot.docs.map(doc => doc.data() as Resource)
      
      const newCounts = {
        article: 0,
        video: 0,
        faq: 0,
        terms_condition: 0,
      };

      resourceList.forEach(resource => {
        if (resource.contentType in newCounts) {
            newCounts[resource.contentType as keyof typeof newCounts]++;
        }
      })

      setCounts(newCounts)

    } catch (error) {
      console.error("Error fetching resource counts:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resource counts.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const resourceTypes = [
    { type: 'article', title: 'Articles' },
    { type: 'video', title: 'Videos' },
    { type: 'faq', title: 'FAQs' },
    { type: 'terms_condition', title: 'Terms & Conditions' },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Help & Support</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {resourceTypes.map((resType) => {
            const Icon = iconMapping[resType.type as keyof typeof iconMapping];
            return (
                 <Card key={resType.type}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{resType.title}</CardTitle>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> : <Icon className={`h-4 w-4 text-muted-foreground`} />}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : counts[resType.type as keyof typeof counts]}
                        </div>
                        <Link href={`/support/list?type=${resType.type}`} className="text-xs text-muted-foreground flex items-center hover:underline">
                            View All <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </CardContent>
                </Card>
            )
        })}
      </div>

    </div>
  )
}
