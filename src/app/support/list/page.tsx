
'use client'

import * as React from "react"
import { useSearchParams, useRouter } from 'next/navigation'
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import type { Resource } from "@/types/resource"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const typeDisplayNames: Record<string, string> = {
  article: 'Articles',
  video: 'Videos',
  faq: 'FAQs',
  terms_condition: 'Terms & Conditions'
};

export default function ResourceListPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const resourceType = searchParams.get('type')
  
  const [resources, setResources] = React.useState<Resource[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchResources = React.useCallback(async () => {
    if (!resourceType) return;
    setIsLoading(true)
    try {
      const q = query(collection(db, "resources"), where("contentType", "==", resourceType))
      const snapshot = await getDocs(q)
      const resourceList = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as Timestamp).toDate(),
          } as Resource
      })
      setResources(resourceList)
    } catch (error) {
      console.error("Error fetching resources:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resources.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [resourceType, toast])

  React.useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const title = resourceType ? typeDisplayNames[resourceType] || 'Resources' : 'Resources';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">{title}</h1>
      </div>

       {isLoading ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>
            ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
            <p>No resources found for this category.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resources.map((resource) => (
            <Card key={resource.id} className="flex flex-col">
                <CardHeader className="p-0">
                <Image
                    src={resource.featureImage || 'https://placehold.co/600x400.png'}
                    alt={resource.title}
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover aspect-video"
                />
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                    <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/support/resource/${resource.id}`}>
                            Read More <ArrowRight className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
    </div>
  )
}
