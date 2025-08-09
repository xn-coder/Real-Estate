
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChevronRight, Loader2, DollarSign, Gift } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { WithdrawalRequest } from "@/types/wallet"

type WalletStats = {
    totalEarnings: number;
    totalRewardPoints: number;
}

export default function WalletPage() {
    const { user } = useUser();
    const [stats, setStats] = React.useState<WalletStats>({
        totalEarnings: 0,
        totalRewardPoints: 0,
    });
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Fetch total approved withdrawal amount
                const withdrawalQuery = query(
                    collection(db, "withdrawal_requests"),
                    where("userId", "==", user.id),
                    where("status", "==", "Approved")
                );
                const withdrawalSnapshot = await getDocs(withdrawalQuery);
                const totalEarnings = withdrawalSnapshot.docs.reduce(
                    (sum, doc) => sum + (doc.data() as WithdrawalRequest).amount,
                    0
                );

                // Fetch reward points balance
                const walletRef = doc(db, "wallets", user.id);
                const walletSnap = await getDoc(walletRef);
                const totalRewardPoints = walletSnap.exists() ? walletSnap.data().rewardBalance || 0 : 0;
                
                setStats({
                    totalEarnings,
                    totalRewardPoints,
                });

            } catch(e) {
                console.error("Error fetching wallet stats:", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, [user]);

    const walletStats = [
        { title: "Total Earnings", amount: stats.totalEarnings.toLocaleString(), description: "From approved withdrawals", icon: DollarSign },
        { title: "Total Reward Points", amount: stats.totalRewardPoints.toLocaleString(), description: "Available to claim", icon: Gift },
    ]

    const walletOptions = [
        { name: "Withdrawal Request", href: "/wallet-billing/withdrawal" },
        { name: "Claim Reward Points", href: "/wallet-billing/rewards" },
        { name: "Reward Points History", href: "/wallet-billing/rewards/history" },
        { name: "Payment History", href: "/wallet-billing/history" },
    ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Earning & Wallet</h1>
      </div>

        <div className="grid gap-4 md:grid-cols-2">
            {walletStats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                             {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stat.title === "Total Earnings" ? `₹${stat.amount}`: stat.amount) }
                        </div>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <Card>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {walletOptions.map((option) => (
                        <Link href={option.href} key={option.name}>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                                <span className="font-medium">{option.name}</span>
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
