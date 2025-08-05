
'use client'

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import type { Resource } from "@/types/resource"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { format } from "date-fns"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function ResourceDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const resourceId = params.id as string

  const [resource, setResource] = React.useState<Resource | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchResource = React.useCallback(async () => {
    if (!resourceId) return;
    setIsLoading(true)
    try {
      const docRef = doc(db, "resources", resourceId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setResource({
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate()
        } as Resource)
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "This resource could not be found.",
        })
        router.push('/support');
      }
    } catch (error) {
      console.error("Error fetching resource:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resource details.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [resourceId, toast, router])

  React.useEffect(() => {
    fetchResource()
  }, [fetchResource])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!resource) {
    return null;
  }
  
  const renderContent = () => {
    switch(resource.contentType) {
      case 'article':
      case 'terms_condition':
        return (
          <>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: resource.articleContent || '' }}
            />
            {resource.faqs && resource.faqs.length > 0 && renderFAQs()}
          </>
        )
      case 'video':
        return (
            <div className="aspect-video">
                <iframe
                    className="w-full h-full rounded-lg"
                    src={resource.videoUrl?.replace("watch?v=", "embed/") || ''}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        )
      case 'faq':
        return renderFAQs()
      default:
        return <p>Unsupported content type.</p>
    }
  }

  const renderFAQs = () => (
    <div className="mt-8">
        <h2 className="text-2xl font-bold font-headline mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
            {(resource.faqs || []).map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  )

  return (
    <div className="flex-1 p-4 md:p-8">
        <div className="mb-6">
             <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
            </Button>
        </div>
        <article className="max-w-4xl mx-auto">
            <header className="mb-8">
                <div className="relative h-64 md:h-96 w-full mb-4">
                    <Image
                        src={resource.featureImage || 'https://placehold.co/1200x400.png'}
                        alt={resource.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                    />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline leading-tight mb-2">{resource.title}</h1>
                <p className="text-sm text-muted-foreground">
                    Published on {format(resource.createdAt as Date, "PPP")}
                </p>
            </header>
            <div className="space-y-6">
                {renderContent()}
            </div>
        </article>
    </div>
  )
}
