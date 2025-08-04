
'use client'

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, ArrowRight, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

const upgradePaths: Record<string, string[]> = {
  affiliate: ['super_affiliate', 'associate', 'channel'],
  super_affiliate: ['associate', 'channel'],
  associate: ['channel'],
  channel: [],
  franchisee: [],
};

const planFeatures: Record<string, string[]> = {
    super_affiliate: ["Higher commission rates", "Access to premium marketing kits", "Priority support"],
    associate: ["Team building capabilities", "Advanced analytics dashboard", "Dedicated account manager"],
    channel: ["Regional exclusivity options", "Co-branded marketing materials", "Direct line to leadership"],
    franchisee: ["Full business model", "Brand usage rights", "Comprehensive training & support"],
}

export default function UpgradePage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !user.role || !roleNameMapping[user.role]) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Could not determine your current partnership plan.</p>
      </div>
    )
  }

  const currentRole = user.role;
  const availableUpgrades = upgradePaths[currentRole] || [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Upgrade Your Partnership</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Current Plan</CardTitle>
          <CardDescription>This is your active partnership level.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted">
                <Star className="h-8 w-8 text-primary"/>
                <div>
                    <h3 className="text-xl font-bold">{roleNameMapping[currentRole]}</h3>
                    <p className="text-sm text-muted-foreground">Your journey with us starts here.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline mb-4">Available Upgrades</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableUpgrades.map((roleKey) => (
            <Card key={roleKey} className="flex flex-col">
              <CardHeader>
                <CardTitle>{roleNameMapping[roleKey]}</CardTitle>
                <CardDescription>Unlock new features and earning potential.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                {planFeatures[roleKey] && planFeatures[roleKey].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                    Upgrade Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          
           <Card className="flex flex-col border-dashed">
              <CardHeader>
                <CardTitle>Franchisee Partner</CardTitle>
                <CardDescription>The ultimate partnership opportunity.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                {planFeatures['franchisee'].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                    Contact Us for Details
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  )
}
