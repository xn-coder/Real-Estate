
'use client'

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"
import { Loader2 } from "lucide-react"
import DigitalCard from "@/components/digital-card"

export default function InternalDigitalCardPage() {
  const params = useParams()
  const partnerId = params.id as string

  const [partner, setPartner] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [websiteData, setWebsiteData] = React.useState<User['website']>({});


  const fetchPartner = React.useCallback(async () => {
    if (!partnerId) return
    setIsLoading(true)
    try {
        const userDocRef = doc(db, "users", partnerId)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
            const partnerData = { id: userDoc.id, ...userDoc.data() } as User;
            setPartner(partnerData);
            
            const websiteDefaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));
            const defaults = websiteDefaultsDoc.exists() ? websiteDefaultsDoc.data() : {};

            const partnerWebsiteData = partnerData.website || {};
            
            const finalWebsiteData = {
                businessProfile: partnerWebsiteData.businessProfile || defaults.businessProfile,
                contactDetails: partnerWebsiteData.contactDetails || partnerData,
            };
            setWebsiteData(finalWebsiteData);

        } else {
            console.error("No such partner!")
            setPartner(null)
        }
    } catch (error) {
      console.error("Error fetching partner:", error)
    } finally {
      setIsLoading(false)
    }
  }, [partnerId])

  React.useEffect(() => {
    fetchPartner()
  }, [fetchPartner])


  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-destructive">Partner not found.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <DigitalCard partner={partner} websiteData={websiteData} />
    </div>
  )
}
