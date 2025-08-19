
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Wallet, Paperclip } from "lucide-react"
import Link from "next/link"

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const manageWalletSchema = z.object({
  transactionType: z.enum(["topup", "send_partner", "send_customer"], {
    required_error: "Please select a transaction type.",
  }),
  recipientId: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount must be at least 1."),
  paymentMethod: z.enum([
    "cash",
    "cheque",
    "debit_card",
    "credit_card",
    "gpay",
    "phonepe",
    "paytm",
    "upi",
    "other",
  ], {
    required_error: "Please select a payment method.",
  }),
  proof: z.any().optional(),
}).refine(data => {
    if ((data.transactionType === "send_partner" || data.transactionType === "send_customer") && !data.recipientId) {
        return false;
    }
    return true;
}, {
    message: "Recipient ID is required for sending funds.",
    path: ["recipientId"],
})

type ManageWalletForm = z.infer<typeof manageWalletSchema>

export default function ManageWalletPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ManageWalletForm>({
    resolver: zodResolver(manageWalletSchema),
    defaultValues: {
      amount: 0,
    },
  })

  const transactionType = form.watch("transactionType");
  const proofFile = form.watch("proof");

  async function onSubmit(values: ManageWalletForm) {
    setIsSubmitting(true)
    
    let proofUrl = "";
    if (values.proof) {
        proofUrl = await fileToDataUrl(values.proof);
        console.log("Proof of transaction uploaded (Data URL):", proofUrl.substring(0, 100) + "...");
    }

    const submissionData = { ...values, proofUrl };
    delete submissionData.proof;

    console.log(submissionData)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast({
      title: "Transaction Successful",
      description: "The transaction has been processed successfully.",
    })
    form.reset({ amount: 0 });
    setIsSubmitting(false)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/wallet-billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Manage Wallet</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
          <CardDescription>Select transaction type and enter the details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="topup">Top-up Wallet</SelectItem>
                        <SelectItem value="send_partner">Send to a Partner</SelectItem>
                        <SelectItem value="send_customer">Send to a Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(transactionType === 'send_partner' || transactionType === 'send_customer') && (
                <FormField
                  control={form.control}
                  name="recipientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {transactionType === 'send_partner' ? 'Partner ID' : 'Customer ID'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`Enter the recipient's ID`} 
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="gpay">GPay</SelectItem>
                        <SelectItem value="phonepe">PhonePe</SelectItem>
                        <SelectItem value="paytm">Paytm</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="proof"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Upload Proof (Optional)</FormLabel>
                        <FormControl>
                            <Input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                onChange={(e) => field.onChange(e.target.files?.[0])}
                                disabled={isSubmitting}
                            />
                        </FormControl>
                        {proofFile && (
                            <div className="text-sm text-muted-foreground pt-2 flex items-center gap-2">
                                <Paperclip className="h-4 w-4"/>
                                <span>{proofFile.name}</span>
                            </div>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : 'Submit Transaction'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
