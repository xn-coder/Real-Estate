
'use client'

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Copy, Share2, Twitter, Facebook, Linkedin } from "lucide-react"
import Image from "next/image"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

export default function ReferAndEarnPage() {
    const { user } = useUser();
    const { toast } = useToast();
    
    // In a real app, this would be generated and fetched for the user
    const referralCode = user ? `REF-${user.id.substring(0, 6)}` : "LOGIN-TO-SEE";

    const copyToClipboard = () => {
        if (user) {
            navigator.clipboard.writeText(referralCode);
            toast({
                title: "Copied!",
                description: "Your referral code has been copied to your clipboard.",
            });
        }
    };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Refer & Earn</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-48 md:h-64 bg-muted">
            <Image 
                src="/refer.jpg"
                alt="Refer a friend banner"
                layout="fill"
                objectFit="cover"
                data-ai-hint="friends sharing gift"
            />
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white p-4">
                    <h2 className="text-4xl font-extrabold font-headline">Share the Benefits, Get Rewarded!</h2>
                    <p className="mt-2 max-w-2xl mx-auto">Invite your friends to join us and earn exciting rewards for every successful referral.</p>
                </div>
            </div>
        </div>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-6 text-center">
          <Card>
              <CardHeader>
                  <CardTitle>1. Share Your Code</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">Share your unique referral code with friends and family.</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle>2. They Sign Up</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">Your friend signs up using your referral code.</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle>3. You Both Earn</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">You both get rewarded once they complete their first transaction.</p>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>Share this code or link with your friends to start earning.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input value={referralCode} readOnly className="font-mono text-lg" />
                <Button size="icon" onClick={copyToClipboard} disabled={!user}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Share via:</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon"><Twitter className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><Facebook className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><Linkedin className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon"><Share2 className="h-5 w-5"/></Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
