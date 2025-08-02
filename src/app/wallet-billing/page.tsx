
'use client'

import * as React from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"

const walletOptions = [
  "Manage Wallet",
  "Send Reward Points",
  "Reward Points History",
  "Receivable Cash List",
  "Payable List",
  "Payment History",
]

export default function WalletBillingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Wallet & Billing</h1>
      </div>
        <Card>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {walletOptions.map((option) => (
                        <div key={option} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                            <span className="font-medium">{option}</span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
