
'use client'

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import { Loader2, ArrowLeft } from "lucide-react"

export default function RedirectToSiteCard() {
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (partnerId) {
        const checkPartnerAndRedirect = async () => {
             try {
                const userDocRef = doc(db, "users", partnerId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    router.replace(`/site/${partnerId}/card`);
                } else {
                    setError("Partner not found. Cannot redirect.");
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error checking partner:", err);
                setError("An error occurred while trying to redirect.");
                setIsLoading(false);
            }
        }
        checkPartnerAndRedirect();
    } else {
        setError("No partner ID provided.");
        setIsLoading(false);
    }
  }, [partnerId, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Redirecting to digital card...</p>
      </div>
    )
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 text-center p-4">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  return null;
}
