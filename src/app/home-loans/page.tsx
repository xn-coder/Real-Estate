
'use client'

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Banknote, ArrowRight } from "lucide-react"
import Image from "next/image"

const features = [
  "Competitive interest rates",
  "Flexible repayment options",
  "Quick and easy application process",
  "Minimal documentation",
  "No hidden charges",
  "Expert guidance from our loan advisors",
];

const eligibility = [
  "Indian resident",
  "Salaried or self-employed individual",
  "Good credit score",
  "Minimum age of 21 years",
];

export default function HomeLoansPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Home Loans</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-48 md:h-64 bg-muted">
            <Image 
                src="https://placehold.co/1200x400.png"
                alt="Home loans banner"
                layout="fill"
                objectFit="cover"
                data-ai-hint="happy family house"
            />
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <h2 className="text-4xl font-extrabold text-white text-center font-headline">Find the Perfect Loan for Your Dream Home</h2>
            </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                  <CardDescription>Benefits of getting a loan with us.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                  ))}
              </CardContent>
          </Card>

          <Card>
               <CardHeader>
                  <CardTitle>Eligibility Criteria</CardTitle>
                  <CardDescription>Check if you are eligible to apply.</CardDescription>
              </CardHeader>
               <CardContent className="space-y-3">
                  {eligibility.map((item, index) => (
                       <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                    </div>
                  ))}
              </CardContent>
          </Card>
          
          <Card className="flex flex-col justify-between">
               <CardHeader>
                  <CardTitle>Ready to Apply?</CardTitle>
                  <CardDescription>Take the next step towards owning your dream home.</CardDescription>
              </CardHeader>
               <CardContent>
                  <p className="text-sm text-muted-foreground">
                      Our expert advisors are here to guide you through every step of the process. Get in touch with us today for a personalized consultation.
                  </p>
              </CardContent>
               <CardContent>
                  <Button className="w-full">
                      Contact a Loan Advisor <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardContent>
          </Card>
      </div>

    </div>
  )
}
