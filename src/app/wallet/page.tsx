
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

const walletStats = [
    { title: "Total Balance", amount: "0", description: "Available in your wallet" },
    { title: "Revenue", amount: "0", description: "Total income generated" },
    { title: "Receivable", amount: "0", description: "Amount to be received" },
    { title: "Payable", amount: "0", description: "Amount to be paid" },
]

const walletOptions = [
  { name: "Withdrawal Request", href: "#" },
  { name: "Send Reward Points", href: "#" },
  { name: "Reward Points History", href: "#" },
  { name: "Payment History", href: "#" },
]

export default function WalletPage() {
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
                        <div className="text-2xl font-bold">₹{stat.amount}</div>
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
