
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
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

type WalletStats = {
    totalBalance: number;
    totalRevenue: number;
    totalReceivable: number;
    totalPayable: number;
}

export default function WalletBillingPage() {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = React.useState<WalletStats>({
      totalBalance: 0,
      totalRevenue: 0,
      totalReceivable: 0,
      totalPayable: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
      const fetchStats = async () => {
          if (!isAdmin) {
              setIsLoading(false);
              return;
          };
          setIsLoading(true);
          try {
              const snapshot = await getDocs(collection(db, "wallets"));
              let totalBalance = 0, totalRevenue = 0, totalReceivable = 0, totalPayable = 0;
              snapshot.forEach(doc => {
                  const data = doc.data();
                  totalBalance += data.balance || 0;
                  totalRevenue += data.revenue || 0;
                  totalReceivable += data.receivable || 0;
                  totalPayable += data.payable || 0;
              });
              setStats({ totalBalance, totalRevenue, totalReceivable, totalPayable });
          } catch(e) {
              console.error("Error fetching wallet stats:", e);
          } finally {
              setIsLoading(false);
          }
      }
      fetchStats();
  }, [isAdmin]);

  const walletStats = [
    { title: "Total Balance", amount: stats.totalBalance.toLocaleString(), description: "Across all wallets" },
    { title: "Total Revenue", amount: stats.totalRevenue.toLocaleString(), description: "Total income generated" },
    { title: "Total Receivable", amount: stats.totalReceivable.toLocaleString(), description: "Total amount to be received" },
    { title: "Total Payable", amount: stats.totalPayable.toLocaleString(), description: "Total amount to be paid" },
  ]

  const walletOptions = [
    ...(isAdmin ? [{ name: "Manage Wallet", href: "/wallet-billing/manage" }] : []),
    { name: "Withdrawal Request", href: "/wallet-billing/withdrawal" },
    { name: isAdmin ? "Send Reward Points" : "Claim Reward Points", href: "/wallet-billing/rewards" },
    { name: "Reward Points History", href: "/wallet-billing/rewards/history" },
    ...(isAdmin ? [
      { name: "Receivable Cash List", href: "/wallet-billing/receivable" },
      { name: "Payable List", href: "/wallet-billing/payable" },
      { name: "Renew Billing & Invoice, Quotation", href: "/wallet-billing/billing" },
    ] : []),
    { name: "Payment History", href: "/wallet-billing/history" },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Wallet & Billing</h1>
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
