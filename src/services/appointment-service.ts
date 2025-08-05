
'use server'

import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface AppointmentData {
    leadId: string;
    propertyId: string;
    partnerId: string;
    visitDate: Date;
}

export async function createAppointment(data: AppointmentData): Promise<void> {
    try {
        await addDoc(collection(db, "appointments"), {
            ...data,
            visitDate: Timestamp.fromDate(data.visitDate),
            status: 'Scheduled',
            createdAt: Timestamp.now(),
        });
        console.log("Appointment created successfully for lead:", data.leadId);
    } catch (error) {
        console.error("Error creating appointment:", error);
        throw new Error("Could not create appointment in database.");
    }
}
