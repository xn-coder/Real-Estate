
'use server'

import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { Lead } from "@/types/lead";
import type { Appointment } from "@/types/appointment";

interface AppointmentData {
    leadId: string;
    propertyId: string;
    partnerId: string;
    visitDate: Date;
}

export async function createAppointment(data: AppointmentData): Promise<void> {
    try {
        // 1. Fetch the lead to get the customerId
        const leadDocRef = doc(db, "leads", data.leadId);
        const leadDoc = await getDoc(leadDocRef);
        if (!leadDoc.exists()) {
            throw new Error("Lead not found.");
        }
        const leadData = leadDoc.data() as Lead;
        const customerId = leadData.customerId;

        if (!customerId) {
            throw new Error("Customer ID not found on the lead record.");
        }

        // 2. Check for existing appointments for the same customer, property, and date
        const appointmentsCollection = collection(db, "appointments");
        
        // Normalize the start and end of the day for the query
        const startOfDay = new Date(data.visitDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(data.visitDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            appointmentsCollection,
            where("customerId", "==", customerId),
            where("propertyId", "==", data.propertyId),
            where("visitDate", ">=", Timestamp.fromDate(startOfDay)),
            where("visitDate", "<=", Timestamp.fromDate(endOfDay))
        );

        const existingAppointmentsSnapshot = await getDocs(q);

        if (!existingAppointmentsSnapshot.empty) {
            // An appointment for this customer, property, and day already exists.
            throw new Error("A visit for this property is already scheduled for this day.");
        }

        // 3. Create the new appointment if no duplicates are found
        const newAppointment: Omit<Appointment, 'id'> = {
            leadId: data.leadId,
            propertyId: data.propertyId,
            partnerId: data.partnerId,
            customerId: customerId,
            visitDate: Timestamp.fromDate(data.visitDate),
            status: 'Scheduled',
            createdAt: Timestamp.now(),
        };

        await addDoc(collection(db, "appointments"), newAppointment);

        console.log("Appointment created successfully for lead:", data.leadId);
    } catch (error: any) {
        console.error("Error creating appointment:", error);
        // Re-throw the specific error message to be caught in the UI
        throw new Error(error.message || "Could not create appointment in database.");
    }
}
