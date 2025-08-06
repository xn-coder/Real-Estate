
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Gift, Search, User } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const sendRewardsSchema = z.object({
  recipientId: z.string().min(1, "Please select a recipient."),
  points: z.coerce.number().min(1, "Points must be at least 1."),
  notes: z.string().optional(),
})
type SendRewardsForm = z.infer<typeof sendRewardsSchema>

const claimRewardsSchema = z.object({
    points: z.coerce.number().min(1, "Points must be at least 1."),
})
type ClaimRewardsForm = z.infer<typeof claimRewardsSchema>

export default function RewardsPage() {
  const { user, isLoading: isUserLoading } = useUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [partners, setPartners] = React.useState<PartnerUser[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerUser | null>(null)

  const isAdmin = user?.role === 'admin'

  const sendForm = useForm<SendRewardsForm>({
    resolver: zodResolver(sendRewardsSchema),
  })

  const claimForm = useForm<ClaimRewardsForm>({
    resolver: zodResolver(claimRewardsSchema),
  })

  React.useEffect(() => {
    if (isAdmin) {
      const fetchPartners = async () => {
        try {
          const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
          const q = query(collection(db, "users"), where("role", "in", partnerRoles))
          const snapshot = await getDocs(q)
          setPartners(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerUser)))
        } catch (error) {
          console.error("Error fetching partners:", error)
        }
      }
      fetchPartners()
    }
  }, [isAdmin])
  
  const filteredPartners = React.useMemo(() => {
    if (!searchTerm) return partners;
    return partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [partners, searchTerm])

  const handleSelectPartner = (partner: PartnerUser) => {
    setSelectedPartner(partner);
    sendForm.setValue("recipientId", partner.id);
    setSearchTerm("");
  }
  
  async function onSendSubmit(values: SendRewardsForm) {
      if (!user) return;
      setIsSubmitting(true);
      try {
          // In a real app, this would be a single transaction
          const batch = writeBatch(db);
          
          // Add to reward transaction history (new collection)
          // Update recipient's wallet/reward balance
          
          console.log("Sending rewards:", values);
          await new Promise(res => setTimeout(res, 1000));

          toast({ title: "Success", description: `${values.points} points sent to ${selectedPartner?.name}.` });
          sendForm.reset();
          setSelectedPartner(null);

      } catch (error) {
          console.error("Error sending rewards:", error);
          toast({ variant: 'destructive', title: "Error", description: "Failed to send reward points." });
      } finally {
          setIsSubmitting(false);
      }
  }

  async function onClaimSubmit(values: ClaimRewardsForm) {
       if (!user) return;
        setIsSubmitting(true);
        try {
            // Check if user has enough points
            // In a real app, this would be a single transaction
             const batch = writeBatch(db);

            // Add to reward transaction history (new collection)
            // Update user's wallet (increase) and reward balance (decrease)

            console.log("Claiming rewards:", values);
            await new Promise(res => setTimeout(res, 1000));
            toast({ title: "Success", description: `You have claimed ${values.points} points.` });
            claimForm.reset();

        } catch (error) {
             console.error("Error claiming rewards:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to claim reward points." });
        } finally {
            setIsSubmitting(false);
        }
  }
  

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/wallet-billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">
            {isAdmin ? "Send Reward Points" : "Claim Reward Points"}
        </h1>
      </div>
      
      <Card className="max-w-2xl">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary"/>
                {isAdmin ? "Send Rewards" : "Claim My Rewards"}
            </CardTitle>
            <CardDescription>
                {isAdmin ? "Select a partner and send them reward points." : "Convert your available reward points into your wallet balance."}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isAdmin ? (
                <Form {...sendForm}>
                    <form onSubmit={sendForm.handleSubmit(onSendSubmit)} className="space-y-6">
                       <FormField
                            control={sendForm.control}
                            name="recipientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recipient</FormLabel>
                                    <FormControl>
                                       <div className="space-y-2">
                                            {selectedPartner ? (
                                                <div className="flex items-center gap-4 p-2 border rounded-md">
                                                    <Avatar>
                                                        <AvatarImage src={selectedPartner.profileImage} />
                                                        <AvatarFallback>{selectedPartner.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{selectedPartner.name}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedPartner.email}</p>
                                                    </div>
                                                    <Button variant="ghost" onClick={() => setSelectedPartner(null)}>Change</Button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            placeholder="Search for a partner..."
                                                            className="pl-8"
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                    {searchTerm && (
                                                        <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                                                            {filteredPartners.length > 0 ? filteredPartners.map(p => (
                                                                <div key={p.id} onClick={() => handleSelectPartner(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                                                                    {p.name} ({p.email})
                                                                </div>
                                                            )) : <p className="p-4 text-sm text-center text-muted-foreground">No partners found.</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                       </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                       />

                        <FormField
                            control={sendForm.control}
                            name="points"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Points to Send</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={sendForm.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Monthly bonus" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Send Points
                        </Button>
                    </form>
                </Form>
            ) : (
                 <Form {...claimForm}>
                    <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-6">
                        <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">Available Reward Points</p>
                            <p className="text-3xl font-bold">1,200</p>
                        </div>
                         <FormField
                            control={claimForm.control}
                            name="points"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Points to Claim</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Enter amount to claim" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Claim Now
                        </Button>
                    </form>
                </Form>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
