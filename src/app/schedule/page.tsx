
'use client'

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2, Map, Calendar as CalendarIcon, X, MoreHorizontal, CheckCircle, Ban, Building, Upload, Hourglass } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import type { Appointment } from "@/types/appointment"
import type { Property } from "@/types/property"
import type { Lead } from "@/types/lead"
import { format, isSameDay } from "date-fns"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { createAppointment, getScheduledSlotsForProperty } from "@/services/appointment-service"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

type DetailedAppointment = Appointment & {
  property?: Property;
  lead?: Lead;
};

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context.'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(file.type, 0.9)); // Get data URL, quality 0.9
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const timeSlots = Array.from({ length: 8 }, (_, i) => {
    const hour = 10 + i;
    return `${hour}:00`;
});

export default function SchedulePage() {
  const { user } = useUser()
  const { toast } = useToast();
  const [appointments, setAppointments] = React.useState<DetailedAppointment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [isMapOpen, setIsMapOpen] = React.useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [isConfirmVisitOpen, setIsConfirmVisitOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<DetailedAppointment | null>(null);
  const [newVisitDate, setNewVisitDate] = React.useState<Date | undefined>(new Date());
  const [newVisitTime, setNewVisitTime] = React.useState<string | undefined>();
  const [visitProofUrl, setVisitProofUrl] = React.useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = React.useState<{date: Date, time: string}[]>([]);


  const isCustomer = user?.role === 'customer';

  const fetchAppointments = React.useCallback(async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const appointmentsCollection = collection(db, "appointments")
        let q;
        if (user.role === 'admin' || user.role === 'seller') {
            q = query(appointmentsCollection)
        } else if (user.role === 'customer') {
            q = query(appointmentsCollection, where("customerId", "==", user.id));
        } else { // Partner roles
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
    }, [user])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const { upcomingAppointments, pastAppointments } = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to beginning of today

    const upcoming = appointments
        .filter(a => new Date(a.visitDate as Date) >= now && a.status === 'Scheduled')
        .sort((a,b) => (a.visitDate as Date).getTime() - (b.visitDate as Date).getTime());
        
    const past = appointments
        .filter(a => new Date(a.visitDate as Date) < now || a.status !== 'Scheduled')
        .sort((a,b) => (b.visitDate as Date).getTime() - (a.visitDate as Date).getTime());

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);


  const handleMapView = (property: Property) => {
    setSelectedProperty(property);
    setIsMapOpen(true);
  }
  
  const handleUpdateStatus = async (appointmentId: string, status: Appointment['status'], proofUrl?: string) => {
      setIsUpdating(appointmentId);
      try {
          const appointmentRef = doc(db, "appointments", appointmentId);
          const updateData: { status: string; visitProofUrl?: string } = { status };
          if (proofUrl) {
              updateData.visitProofUrl = proofUrl;
          }
          await updateDoc(appointmentRef, updateData);
          toast({ title: `Visit ${status}`, description: `The appointment status has been updated to '${status}'.`});
          fetchAppointments();
          if (status === 'Pending Verification') {
              setIsConfirmVisitOpen(false);
          }
      } catch (error) {
          console.error(`Error updating visit to ${status}:`, error);
          toast({ variant: 'destructive', title: "Update Failed", description: `Could not update the visit status.`});
      } finally {
          setIsUpdating(null);
      }
  }

  const handleConfirmVisitClick = (appointment: DetailedAppointment) => {
      setSelectedAppointment(appointment);
      setIsConfirmVisitOpen(true);
  }

  const handleConfirmVisitSubmit = async () => {
    if (!selectedAppointment || !visitProofUrl) {
        toast({ variant: 'destructive', title: "Missing Proof", description: "Please upload an image as proof of visit." });
        return;
    }
    await handleUpdateStatus(selectedAppointment.id, 'Pending Verification', visitProofUrl);
  };


  const handleRescheduleClick = async (appointment: DetailedAppointment) => {
      setSelectedAppointment(appointment);
      setNewVisitDate(appointment.visitDate as Date);
      setNewVisitTime(appointment.visitTime);
      const slots = await getScheduledSlotsForProperty(appointment.propertyId);
      setBookedSlots(slots);
      setIsRescheduleOpen(true);
  }

  const handleReschedule = async () => {
    if (!selectedAppointment || !newVisitDate || !newVisitTime) return;
    setIsUpdating(selectedAppointment.id);
    try {
      const appointmentRef = doc(db, "appointments", selectedAppointment.id);
      await updateDoc(appointmentRef, { 
          visitDate: Timestamp.fromDate(newVisitDate),
          visitTime: newVisitTime,
      });
      toast({ title: "Rescheduled", description: "The appointment has been successfully rescheduled." });
      fetchAppointments();
      setIsRescheduleOpen(false);
    } catch (error) {
      console.error("Error rescheduling visit:", error);
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not reschedule the visit." });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const statusBadge = (status: Appointment['status']) => {
      switch(status) {
          case 'Scheduled':
              return <Badge variant="secondary">Pending</Badge>;
          case 'Completed':
              return <Badge>Confirmed</Badge>;
          case 'Cancelled':
              return <Badge variant="destructive">Cancelled</Badge>;
          case 'Pending Verification':
              return <Badge variant="outline">Pending Verification</Badge>;
          default:
              return <Badge variant="outline">{status}</Badge>;
      }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        try {
            const resizedDataUrl = await resizeImage(file, 800, 800); // Max width/height 800px
            setVisitProofUrl(resizedDataUrl);
        } catch (error) {
            console.error("Error resizing image:", error);
            toast({
                variant: 'destructive',
                title: 'Image Error',
                description: 'Could not process the selected image.',
            });
        }
    }
  };
  
  const bookedTimesForSelectedDate = newVisitDate
    ? bookedSlots.filter(slot => isSameDay(slot.date, newVisitDate)).map(slot => slot.time)
    : [];


  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Current Appointments</CardTitle>
          <CardDescription>
            You have {upcomingAppointments.length} upcoming appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date & Time</TableHead>
                        {!isCustomer && <TableHead>Client</TableHead>}
                        <TableHead>Property</TableHead>
                        {!isCustomer && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={isCustomer ? 2 : 4} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                            </TableCell>
                        </TableRow>
                    ) : upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                                {format(appointment.visitDate as Date, "PPP")} at {appointment.visitTime}
                            </TableCell>
                            {!isCustomer && <TableCell>{appointment.lead?.name || 'N/A'}</TableCell>}
                            <TableCell>
                                {appointment.property ? (
                                    <Button variant="link" asChild className="p-0 h-auto font-normal">
                                        <Link href={`/listings/${appointment.propertyId}`}>
                                            <Building className="mr-2 h-4 w-4" />
                                            {appointment.property.catalogTitle}
                                        </Link>
                                    </Button>
                                ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                )}
                            </TableCell>
                            {!isCustomer && (
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={!!isUpdating}>
                                                {isUpdating === appointment.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleConfirmVisitClick(appointment)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Confirm Visit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => appointment.property && handleMapView(appointment.property)}>
                                                <Map className="mr-2 h-4 w-4" /> Map View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRescheduleClick(appointment)}>
                                                <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleUpdateStatus(appointment.id, 'Cancelled')} className="text-destructive">
                                                <Ban className="mr-2 h-4 w-4" /> Cancel Visit
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            )}
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={isCustomer ? 2 : 4} className="text-center h-24 text-muted-foreground">
                                No upcoming appointments.
                            </TableCell>
                         </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Past Appointments</CardTitle>
          <CardDescription>
            A log of your previous appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date & Time</TableHead>
                        {!isCustomer && <TableHead>Client</TableHead>}
                        <TableHead>Property</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={isCustomer ? 3 : 4} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                            </TableCell>
                        </TableRow>
                    ) : pastAppointments.length > 0 ? (
                        pastAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                                {format(appointment.visitDate as Date, "PPP")} at {appointment.visitTime}
                            </TableCell>
                            {!isCustomer && <TableCell>{appointment.lead?.name || 'N/A'}</TableCell>}
                            <TableCell>
                                {appointment.property ? (
                                     <Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground">
                                        <Link href={`/listings/${appointment.propertyId}`}>
                                            {appointment.property.catalogTitle}
                                        </Link>
                                    </Button>
                                ) : (
                                    <span>N/A</span>
                                )}
                            </TableCell>
                            <TableCell>{statusBadge(appointment.status)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={isCustomer ? 3 : 4} className="text-center h-24 text-muted-foreground">
                                No past appointments.
                            </TableCell>
                         </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

        <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for the visit with {selectedAppointment?.lead?.name}.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 flex flex-col md:flex-row items-center gap-4">
                    <Calendar
                        mode="single"
                        selected={newVisitDate}
                        onSelect={setNewVisitDate}
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                    />
                    <div className="w-full md:w-auto">
                        <Select onValueChange={setNewVisitTime} value={newVisitTime}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a time slot" />
                            </SelectTrigger>
                            <SelectContent>
                                {timeSlots.map(time => (
                                    <SelectItem key={time} value={time} disabled={bookedTimesForSelectedDate.includes(time)}>
                                        {time} {bookedTimesForSelectedDate.includes(time) && "(Booked)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
                     <Button onClick={handleReschedule} disabled={!!isUpdating || !newVisitTime}>
                        {isUpdating === selectedAppointment?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Reschedule
                     </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isConfirmVisitOpen} onOpenChange={(open) => { if(!open) { setVisitProofUrl(null); } setIsConfirmVisitOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Site Visit</DialogTitle>
                    <DialogDescription>
                        Upload proof of the visit for {selectedAppointment?.lead?.name}. This will be sent for verification.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                     {visitProofUrl && (
                        <div className="flex justify-center">
                            <Image src={visitProofUrl} alt="Visit Proof Preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md" />
                        </div>
                     )}
                     <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setIsConfirmVisitOpen(false)}>Cancel</Button>
                     <Button onClick={handleConfirmVisitSubmit} disabled={!!isUpdating || !visitProofUrl}>
                        {isUpdating === selectedAppointment?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Upload
                     </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
