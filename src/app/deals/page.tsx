
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { dealsByStage } from "@/lib/data"
import { PlusCircle } from "lucide-react"

const dealStages = ["Inquiry", "Viewing", "Offer Made", "Under Contract", "Closing"]

export default function DealsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold font-headline">Deal Pipeline</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Deal
        </Button>
      </header>
      <main className="flex-1 p-4 overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {dealStages.map((stage) => (
            <div key={stage} className="w-72 flex-shrink-0">
              <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-muted">
                <h2 className="font-semibold text-sm">{stage}</h2>
                <span className="text-sm font-medium text-muted-foreground">
                  {dealsByStage[stage]?.length || 0}
                </span>
              </div>
              <div className="space-y-3">
                {(dealsByStage[stage] || []).map((deal) => (
                  <Card key={deal.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{deal.property}</CardTitle>
                      <CardDescription>{deal.client}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-primary">
                          ${deal.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Closing: {new Date(deal.closingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
