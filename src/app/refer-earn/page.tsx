'use client'

import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Award } from "lucide-react"
import Link from "next/link"

export default function ReferAndEarnPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex items-center justify-center">
      <Card className="text-center max-w-lg">
          <CardHeader>
              <div className="mx-auto bg-primary/10 text-primary rounded-full h-16 w-16 flex items-center justify-center">
                  <Award className="h-8 w-8"/>
              </div>
              <CardTitle className="pt-4">Upgrade to a Partner Account</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                  Take your experience to the next level. As a Partner, you'll unlock exclusive tools, higher earning potential, and advanced features to grow your business with us.
              </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
              <Button asChild size="lg">
                  <Link href="/upgrade">
                    Explore Partner Benefits <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
              </Button>
          </CardFooter>
      </Card>
    </div>
  )
}
