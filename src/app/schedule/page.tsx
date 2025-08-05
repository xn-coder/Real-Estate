
'use client'

import React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2, Map, Calendar as CalendarIcon, X, MoreHorizontal } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import type { Appointment } from "@/types/appointment"
import type { Property } from "@/types/property"
import type { Lead } from "@/types/lead"
import { format } from "date-fns"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

type DetailedAppointment = Appointment & {
  property?: Property;
  lead?: Lead;
};

export default function SchedulePage() {
  const { user } = useUser()
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = React.useState<DetailedAppointment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [isMapOpen, setIsMapOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const appointmentsCollection = collection(db, "appointments")
        let q;
        if (user.role === 'admin' || user.role === 'seller') {
            q = query(appointmentsCollection)
        } else {
            q = query(appointmentsCollection, where("partnerId", "==", user.id))
        }

        const snapshot = await getDocs(q)
        const appointmentsData = await Promise.all(snapshot.docs.map(async (docData) => {
            const appointment = { id: docData.id, ...docData.data() } as Appointment;
            
            const propDocRef = doc(db, "properties", appointment.propertyId);
            const propDoc = await getDoc(propDocRef);
            let propertyData: Property | undefined = undefined;
            if (propDoc.exists()) {
                const data = propDoc.data() as Property;
                propertyData = { ...data, id: propDoc.id };
            }

            const leadDocRef = doc(db, "leads", appointment.leadId);
            const leadDoc = await getDoc(leadDocRef);
            let leadData: Lead | undefined = undefined;
            if (leadDoc.exists()) {
                leadData = leadDoc.data() as Lead;
            }

            return { 
                ...appointment,
                visitDate: (appointment.visitDate as Timestamp).toDate(),
                property: propertyData,
                lead: leadData
            } as DetailedAppointment;
        }));
        
        setAppointments(appointmentsData);
      } catch (error) {
        console.error("Error fetching appointments:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAppointments()
  }, [user])

  const selectedDayAppointments = appointments.filter(
    (appointment) =>
      date && new Date(appointment.visitDate as Date).toDateString() === date.toDateString()
  ).sort((a,b) => (a.visitDate as Date).getTime() - (b.visitDate as Date).getTime())

  const handleMapView = (property: Property) => {
    setSelectedProperty(property);
    setIsMapOpen(true);
  }

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
                className="p-3 w-full"
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
                Appointments for {date ? format(date, "PPP") : 'today'}
              </CardTitle>
              <CardDescription>
                You have {selectedDayAppointments.length} appointments scheduled.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : selectedDayAppointments.length > 0 ? (
                            selectedDayAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                                <TableCell className="font-medium">{format(appointment.visitDate as Date, "p")}</TableCell>
                                <TableCell>{appointment.lead?.name || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{appointment.property?.catalogTitle || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => appointment.property && handleMapView(appointment.property)}>
                                                <Map className="mr-2 h-4 w-4" /> Map View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                                <X className="mr-2 h-4 w-4" /> Cancel
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No appointments for this day.
                                </TableCell>
                             </TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{selectedProperty?.catalogTitle}</DialogTitle>
                </DialogHeader>
                {selectedProperty?.latitude && selectedProperty?.longitude && (
                     <LocationPicker 
                        onLocationChange={() => {}} 
                        position={[parseFloat(selectedProperty.latitude), parseFloat(selectedProperty.longitude)]}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  )
}
