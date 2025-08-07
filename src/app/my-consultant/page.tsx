
'use client'

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, limit } from "firebase/firestore"
import type { User } from "@/types/user"
import type { Lead } from "@/types/lead"
import { Loader2, Building, User as UserIcon, Phone, Mail } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const ConsultantProfileCard = ({ title, user, type }: { title: string, user: User | null, type: 'Seller' | 'Partner' }) => {
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No {type.toLowerCase()} found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.profileImage} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{type}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{user.phone}</span>
        </div>
        <div className="flex items-center gap-3">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{user.businessName || 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MyConsultantPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [partner, setPartner] = React.useState<User | null>(null);
  const [seller, setSeller] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const fetchConsultants = async () => {
      setIsLoading(true);
      try {
        const leadsRef = collection(db, "leads");
        const q = query(leadsRef, where("customerId", "==", user.id), limit(1));
        const leadSnapshot = await getDocs(q);

        if (!leadSnapshot.empty) {
          const lead = leadSnapshot.docs[0].data() as Lead;

          // Fetch Partner
          if (lead.partnerId) {
            const partnerDoc = await getDoc(doc(db, "users", lead.partnerId));
            if (partnerDoc.exists()) {
              setPartner({ id: partnerDoc.id, ...partnerDoc.data() } as User);
            }
          }

          // Fetch Seller (owner of the property)
          if (lead.propertyId) {
            const propertyDoc = await getDoc(doc(db, "properties", lead.propertyId));
            if (propertyDoc.exists()) {
              const property = propertyDoc.data();
              if (property.email) {
                const sellerQuery = query(collection(db, "users"), where("email", "==", property.email), limit(1));
                const sellerSnapshot = await getDocs(sellerQuery);
                if (!sellerSnapshot.empty) {
                  const sellerDoc = sellerSnapshot.docs[0];
                  setSeller({ id: sellerDoc.id, ...sellerDoc.data() } as User);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching consultants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultants();
  }, [user]);

  if (isLoading || isUserLoading) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Consultant</h1>
      </div>
      <p className="text-muted-foreground">
        Here are the contact details for the partner and seller who assisted you with your property search.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <ConsultantProfileCard title="Your Partner" user={partner} type="Partner" />
        <ConsultantProfileCard title="Property Seller" user={seller} type="Seller" />
      </div>
    </div>
  );
}
