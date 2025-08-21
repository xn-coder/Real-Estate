
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
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Lead } from "@/types/lead"
import type { Property, EarningRuleValue } from "@/types/property"
import type { User } from "@/types/user"


type WalletStats = {
    totalBalance: number;
    totalRevenue: number;
    totalReceivable: number;
    totalPayable: number;
}

const calculateEarning = (dealValue: number, rule: EarningRuleValue) => {
    switch (rule.type) {
        case "commission_percentage":
            return (dealValue * rule.value) / 100;
        case "flat_amount":
            return rule.value;
        case "per_sq_ft":
            return rule.value * (rule.totalSqFt || 0);
        case "reward_points":
        default:
            return 0; // Not a monetary earning
    }
}

export default function WalletBillingPage() {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';
  const [stats, setStats] = React.useState<WalletStats>({
      totalBalance: 0,
      totalRevenue: 0,
      totalReceivable: 0,
      totalPayable: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
      const fetchStats = async () => {
          if (!user) return;

          setIsLoading(true);
          try {
              let totalBalance = 0, totalRevenue = 0, totalReceivable = 0, totalPayable = 0;

              if (isAdmin) {
                  const walletsSnapshot = await getDocs(collection(db, "wallets"));
                  walletsSnapshot.forEach(doc => {
                      const data = doc.data();
                      totalBalance += data.balance || 0;
                      totalRevenue += data.revenue || 0;
                  });

                  const receivablesSnapshot = await getDocs(query(collection(db, "receivables"), where("status", "==", "Pending")));
                  receivablesSnapshot.forEach(doc => {
                      totalReceivable += doc.data().amount || 0;
                  });
                  
                   // Calculate Payables dynamically
                  const leadsQuery = query(collection(db, "leads"), where("status", "in", ["Deal closed", "Completed"]));
                  const leadsSnapshot = await getDocs(leadsQuery);

                  const globalDefaultsDocRef = doc(db, 'app_settings', 'default_earning_rules');
                  const defaultsDocSnap = await getDoc(globalDefaultsDocRef);
                  const defaultRules = defaultsDocSnap.exists() ? defaultsDocSnap.data().earningRules || {} : {};

                  const payablesPromises = leadsSnapshot.docs.map(async (leadDoc) => {
                      const lead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
                      if (!lead.partnerId || !lead.propertyId) return 0;
                      
                      const [partnerDoc, propertyDoc] = await Promise.all([
                          getDoc(doc(db, "users", lead.partnerId)),
                          getDoc(doc(db, "properties", lead.propertyId))
                      ]);
                      if (!partnerDoc.exists() || !propertyDoc.exists()) return 0;
                      
                      const partner = { id: partnerDoc.id, ...partnerDoc.data() } as User;
                      const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

                      const partnerRole = partner.role as keyof typeof defaultRules;
                      const applicableRule = property.earningRules?.[partnerRole] || defaultRules[partnerRole];

                      if (!applicableRule || applicableRule.type === 'reward_points') return 0;
                      
                      const dealValue = lead.closingAmount || property.listingPrice;
                      return calculateEarning(dealValue, applicableRule);
                  });
                  
                  const payableAmounts = await Promise.all(payablesPromises);
                  totalPayable = payableAmounts.reduce((sum, amount) => sum + amount, 0);


              } else if (isSeller) {
                  const receivablesSnapshot = await getDocs(query(collection(db, "receivables"), where("sellerId", "==", user.id)));
                  receivablesSnapshot.forEach(doc => {
                      if (doc.data().status === 'Pending') {
                        totalReceivable += doc.data().amount || 0;
                      }
                  });
                  
                  // In a real app, seller-specific payables might need calculation too.
                  // For now, it's 0 as per existing logic.
                  totalPayable = 0;
              }
              
              setStats({ totalBalance, totalRevenue, totalReceivable, totalPayable });
          } catch(e) {
              console.error("Error fetching wallet stats:", e);
          } finally {
              setIsLoading(false);
          }
      }
      fetchStats();
  }, [isAdmin, isSeller, user]);

  const walletStats = [
    { title: "Total Balance", amount: stats.totalBalance.toLocaleString(), description: "Across all wallets" },
    { title: "Total Revenue", amount: stats.totalRevenue.toLocaleString(), description: "Total income generated" },
    { title: "Total Receivable", amount: stats.totalReceivable.toLocaleString(), description: "Total pending receivables" },
    { title: "Total Payable", amount: stats.totalPayable.toLocaleString(), description: "Total pending payables" },
  ]

  const walletOptions = [
    ...(isAdmin || isSeller ? [{ name: "Manage Wallet", href: "/wallet-billing/manage" }] : []),
    { name: "Withdrawal Request", href: "/wallet-billing/withdrawal" },
    { name: (isAdmin || isSeller) ? "Send Reward Points" : "Claim Reward Points", href: "/wallet-billing/rewards" },
    ...(isAdmin ? [{ name: "Post Reward Offers", href: "/wallet-billing/post-reward" }] : []),
    { name: "Reward Points History", href: "/wallet-billing/rewards/history" },
    ...(isAdmin ? [{ name: "Claimed Rewards History", href: "/wallet-billing/rewards/claims" }] : []),
    ...(isAdmin || isSeller ? [
      { name: "Receivable Cash List", href: "/wallet-billing/receivable" },
      { name: "Partner Earning", href: "/wallet-billing/payable" },
    ] : []),
    { name: "Payment History", href: "/wallet-billing/history" },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Wallet &amp; Billing</h1>
      </div>
        
        {(isAdmin || isSeller) && (
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
        )}

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
