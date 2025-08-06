
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

type WalletStats = {
    balance: number;
    revenue: number;
    receivable: number;
    payable: number;
}

export default function WalletPage() {
    const { user } = useUser();
    const [stats, setStats] = React.useState<WalletStats>({
        balance: 0,
        revenue: 0,
        receivable: 0,
        payable: 0,
    });
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const walletRef = doc(db, "wallets", user.id);
                const walletSnap = await getDoc(walletRef);
                if (walletSnap.exists()) {
                    const data = walletSnap.data();
                    setStats({
                        balance: data.balance || 0,
                        revenue: data.revenue || 0,
                        receivable: data.receivable || 0,
                        payable: data.payable || 0,
                    });
                }
            } catch(e) {
                console.error("Error fetching wallet stats:", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, [user]);

    const walletStats = [
        { title: "Total Balance", amount: stats.balance.toLocaleString(), description: "Available in your wallet" },
        { title: "Revenue", amount: stats.revenue.toLocaleString(), description: "Total income generated" },
        { title: "Receivable", amount: stats.receivable.toLocaleString(), description: "Amount to be received" },
        { title: "Payable", amount: stats.payable.toLocaleString(), description: "Amount to be paid" },
    ]

    const walletOptions = [
        { name: "Withdrawal Request", href: "/wallet-billing/withdrawal" },
        { name: "Claim Reward Points", href: "/wallet-billing/rewards" },
        { name: "Reward Points History", href: "/wallet-billing/rewards/history" },
        { name: "Payment History", href: "#" },
    ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Earning & Wallet</h1>
      </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {walletStats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                             {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `₹${stat.amount}`}
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
