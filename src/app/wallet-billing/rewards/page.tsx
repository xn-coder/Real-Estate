
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Loader2, ArrowLeft, Gift, Search, User, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, writeBatch, addDoc, Timestamp, getDoc } from "firebase/firestore"
import type { User as PartnerUser } from "@/types/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Wallet, RewardOffer } from "@/types/wallet"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"


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
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [offers, setOffers] = React.useState<RewardOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = React.useState(true);
  const [selectedOffer, setSelectedOffer] = React.useState<RewardOffer | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  const sendForm = useForm<SendRewardsForm>({
    resolver: zodResolver(sendRewardsSchema),
    defaultValues: {
        recipientId: "",
        points: 0,
        notes: ""
    }
  })

  React.useEffect(() => {
    async function fetchData() {
        if (isAdmin || isSeller) {
            try {
                const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];
                const q = query(collection(db, "users"), where("role", "in", partnerRoles))
                const snapshot = await getDocs(q)
                setPartners(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerUser)))
            } catch (error) {
                console.error("Error fetching partners:", error)
            }
        } else if (user) {
            setIsLoadingOffers(true);
            try {
                // Fetch wallet
                const walletRef = doc(db, 'wallets', user.id);
                const walletSnap = await getDoc(walletRef);
                if(walletSnap.exists()) {
                    setWallet(walletSnap.data() as Wallet);
                }

                // Fetch reward offers
                const offersSnapshot = await getDocs(collection(db, "reward_offers"));
                const offersList = await Promise.all(offersSnapshot.docs.map(async (offerDoc) => {
                    const data = offerDoc.data() as RewardOffer;
                    const fileDoc = await getDoc(doc(db, "files", data.imageId));
                    return {
                        ...data,
                        id: offerDoc.id,
                        image: fileDoc.exists() ? fileDoc.data()?.data : 'https://placehold.co/600x400.png',
                    };
                }));
                setOffers(offersList);

            } catch(e) {
                console.error("Error fetching data:", e);
                toast({ variant: "destructive", title: "Error", description: "Could not load rewards data." });
            } finally {
                setIsLoadingOffers(false);
            }
        }
    }
    if (user) {
        fetchData();
    }
  }, [isAdmin, isSeller, user, toast])
  
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
      if (!user || !selectedPartner) return;
      setIsSubmitting(true);
      try {
          const batch = writeBatch(db);

          const transactionRef = doc(collection(db, "reward_transactions"));
          batch.set(transactionRef, {
              fromId: user.id,
              fromName: user.name,
              toId: selectedPartner.id,
              toName: selectedPartner.name,
              points: values.points,
              notes: values.notes || "Points sent",
              type: "Sent",
              date: Timestamp.now(),
          });
          
          const walletRef = doc(db, "wallets", selectedPartner.id);
          const walletDoc = await getDoc(walletRef);
          
          const currentRewardBalance = walletDoc.exists() ? walletDoc.data().rewardBalance || 0 : 0;
          const newRewardBalance = currentRewardBalance + values.points;
          
          batch.set(walletRef, { rewardBalance: newRewardBalance }, { merge: true });

          await batch.commit();

          toast({ title: "Success", description: `${values.points} points sent to ${selectedPartner?.name}.` });
          sendForm.reset({ recipientId: "", points: 0, notes: "" });
          setSelectedPartner(null);

      } catch (error) {
          console.error("Error sending rewards:", error);
          toast({ variant: 'destructive', title: "Error", description: "Failed to send reward points." });
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleClaimClick = (offer: RewardOffer) => {
    const currentPoints = wallet?.rewardBalance || 0;
    if (currentPoints < offer.points) {
        toast({ variant: 'destructive', title: "Not enough points", description: `You need ${offer.points} points to claim this offer.` });
        return;
    }
    setSelectedOffer(offer);
    setIsConfirmDialogOpen(true);
  }

  async function handleConfirmClaim() {
       if (!user || !selectedOffer) return;
        setIsSubmitting(true);
        try {
            const walletRef = doc(db, 'wallets', user.id);
            const walletSnap = await getDoc(walletRef);

            const currentRewardBalance = walletSnap.exists() ? walletSnap.data().rewardBalance || 0 : 0;

            if (selectedOffer.points > currentRewardBalance) {
                toast({ variant: 'destructive', title: "Not enough points", description: "Your points balance is too low."});
                setIsSubmitting(false);
                return;
            }
            
            const batch = writeBatch(db);

            batch.update(walletRef, {
                rewardBalance: currentRewardBalance - selectedOffer.points,
            });
            
            const transactionRef = doc(collection(db, "reward_transactions"));
            batch.set(transactionRef, {
                fromId: user.id,
                fromName: user.name,
                toId: user.id,
                toName: user.name,
                points: selectedOffer.points,
                notes: `Claimed offer: ${selectedOffer.title}`,
                type: "Claimed",
                date: Timestamp.now(),
            });

            await batch.commit();

            toast({ title: "Success", description: `You have successfully claimed the offer: ${selectedOffer.title}` });
            
            // Refetch wallet data
            const updatedWalletSnap = await getDoc(walletRef);
            if (updatedWalletSnap.exists()) {
                setWallet(updatedWalletSnap.data() as Wallet);
            }
            setIsConfirmDialogOpen(false);
            setSelectedOffer(null);

        } catch (error) {
             console.error("Error claiming rewards:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to claim reward." });
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
            {(isAdmin || isSeller) ? "Send Reward Points" : "Claim Reward Points"}
        </h1>
      </div>
      
        {(isAdmin || isSeller) ? (
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary"/>
                        Send Rewards
                    </CardTitle>
                    <CardDescription>
                        Select a partner and send them reward points.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                            <Button type="submit" disabled={isSubmitting || !selectedPartner}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Send Points
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        ) : (
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Your Reward Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">Available Points</p>
                            <p className="text-4xl font-bold">{wallet?.rewardBalance?.toLocaleString() || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                 <h2 className="text-2xl font-bold tracking-tight font-headline">Available Rewards</h2>
                 {isLoadingOffers ? (
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => <Card key={i}><div className="bg-muted rounded-lg h-80 animate-pulse"></div></Card>)}
                     </div>
                 ) : offers.length === 0 ? (
                     <p className="text-muted-foreground">No reward offers available at the moment.</p>
                 ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {offers.map(offer => (
                            <Card key={offer.id} className="flex flex-col">
                                <CardHeader className="p-0">
                                    <div className="relative aspect-[16/9]">
                                         <Image src={offer.image} alt={offer.title} layout="fill" objectFit="cover" className="rounded-t-lg"/>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <CardTitle className="text-lg">{offer.title}</CardTitle>
                                    <div className="prose prose-sm max-w-none text-muted-foreground mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: offer.details }}></div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 border-t mt-auto">
                                    <Button className="w-full" onClick={() => handleClaimClick(offer)} disabled={(wallet?.rewardBalance || 0) < offer.points}>
                                        Claim for {offer.points.toLocaleString()} Points
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                 )}
             </div>
        )}

        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Claim</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to claim "{selectedOffer?.title}" for {selectedOffer?.points.toLocaleString()} points?
                    </DialogDescription>
                </DialogHeader>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmClaim} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
