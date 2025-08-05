
'use client'

import React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2, Map, Calendar as CalendarIcon, X } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore"
import type { Appointment } from "@/types/appointment"
import type { Property } from "@/types/property"
import Image from "next/image"
import { format } from "date-fns"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

type DetailedAppointment = Appointment & {
  property?: Property;
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
                let featureImageUrl = 'https://placehold.co/400x225.png';
                if (data.featureImageId) {
                    const fileDoc = await getDoc(doc(db, 'files', data.featureImageId));
                    if (fileDoc.exists()) {
                        featureImageUrl = fileDoc.data()?.data;
                    }
                }
                propertyData = { ...data, id: propDoc.id, featureImage: featureImageUrl };
            }

            return { 
                ...appointment,
                visitDate: (appointment.visitDate as Timestamp).toDate(),
                property: propertyData
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
  )

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
                Appointments for {date ? format(date, "PPP") : 'today'}
              </CardTitle>
              <CardDescription>
                You have {selectedDayAppointments.length} appointments scheduled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                  <div className="flex justify-center py-8">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : selectedDayAppointments.length > 0 ? (
                selectedDayAppointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-4 flex gap-4">
                        <Image 
                            src={appointment.property?.featureImage || 'https://placehold.co/120x120.png'} 
                            alt={appointment.property?.catalogTitle || 'Property'}
                            width={100}
                            height={100}
                            className="rounded-md object-cover aspect-square"
                            data-ai-hint="house exterior"
                        />
                        <div className="flex-1 flex justify-between">
                            <div className="space-y-1">
                                <p className="font-semibold">{appointment.property?.catalogTitle}</p>
                                <p className="text-sm text-muted-foreground">{appointment.property?.addressLine}</p>
                                <p className="text-sm font-medium pt-2">Visit Time: {format(appointment.visitDate as Date, "p")}</p>
                            </div>
                            <div className="flex flex-col gap-2 justify-center">
                                <Button variant="outline" size="sm" onClick={() => appointment.property && handleMapView(appointment.property)}>
                                    <Map className="mr-2 h-4 w-4" /> Map
                                </Button>
                                <Button variant="outline" size="sm">
                                <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                                </Button>
                                <Button variant="destructive" size="sm">
                                <X className="mr-2 h-4 w-4" /> Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                  </Card>
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
