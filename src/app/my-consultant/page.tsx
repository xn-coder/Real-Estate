
'use client'

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from "firebase/firestore"
import type { User } from "@/types/user"
import type { Lead } from "@/types/lead"
import { Loader2, Building, User as UserIcon, Phone, Mail, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const ConsultantProfileCard = ({ title, user, type }: { title: string, user: User | null, type: 'Seller' | 'Partner' }) => {
  const router = useRouter();

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

  const handleMessage = () => {
    router.push(`/send-message?recipientId=${user.id}&type=to_seller`);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex flex-col items-center text-center gap-4">
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarImage src={user.profileImage} alt={user.name} />
            <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>{type}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-3 p-2 border rounded-md">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-3 p-2 border rounded-md">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{user.phone}</span>
        </div>
        <div className="flex items-center gap-3 p-2 border rounded-md">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{user.businessName || 'N/A'}</span>
        </div>
        <Button className="w-full" onClick={handleMessage}>
            <MessageSquare className="mr-2 h-4 w-4"/>
            Send Message
        </Button>
      </CardContent>
    </Card>
  );
};

export default function MyConsultantPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [seller, setSeller] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const fetchConsultants = async () => {
      setIsLoading(true);
      try {
        const leadsRef = collection(db, "leads");
        const q = query(leadsRef, where("partnerId", "==", user.id), orderBy("createdAt", "desc"), limit(1));
        const leadSnapshot = await getDocs(q);

        if (!leadSnapshot.empty) {
          const lead = leadSnapshot.docs[0].data() as Lead;

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
        } else {
            // If no leads, the default consultant is an admin.
            const adminQuery = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
            const adminSnapshot = await getDocs(adminQuery);
             if (!adminSnapshot.empty) {
                const adminDoc = adminSnapshot.docs[0];
                setSeller({ id: adminDoc.id, ...adminDoc.data() } as User);
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex flex-col items-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Consultant</h1>
        <p className="text-muted-foreground mt-2">
            Here are the contact details for your assigned seller.
        </p>
      </div>

      <ConsultantProfileCard title="Property Seller" user={seller} type="Seller" />
    </div>
  );
}
