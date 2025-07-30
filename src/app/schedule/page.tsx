'use client'

import React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { appointments } from "@/lib/data"
import { Badge } from "@/components/ui/badge"

export default function SchedulePage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  const selectedDayAppointments = appointments.filter(
    (appointment) =>
      date && new Date(appointment.date).toDateString() === date.toDateString()
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Schedule</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-3"
                classNames={{
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                }}
              />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Appointments for {date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'today'}
              </CardTitle>
              <CardDescription>
                You have {selectedDayAppointments.length} appointments scheduled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDayAppointments.length > 0 ? (
                selectedDayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <p className="font-semibold">{appointment.client}</p>
                      <p className="text-sm text-muted-foreground">{appointment.property}</p>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline">{appointment.type}</Badge>
                       <p className="text-sm mt-1">{appointment.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No appointments for this day.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
