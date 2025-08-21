
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
    visitTime: string;
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

        // 2. Check for existing appointments for the same property, date, and time
        const appointmentsCollection = collection(db, "appointments");
        
        const q = query(
            appointmentsCollection,
            where("propertyId", "==", data.propertyId),
            where("visitDate", "==", Timestamp.fromDate(data.visitDate)),
            where("visitTime", "==", data.visitTime)
        );

        const existingAppointmentsSnapshot = await getDocs(q);

        if (!existingAppointmentsSnapshot.empty) {
            throw new Error("This time slot for this property is already booked.");
        }

        // 3. Create the new appointment if no duplicates are found
        const newAppointment: Omit<Appointment, 'id'> = {
            leadId: data.leadId,
            propertyId: data.propertyId,
            partnerId: data.partnerId,
            customerId: customerId,
            visitDate: Timestamp.fromDate(data.visitDate),
            visitTime: data.visitTime,
            status: 'Scheduled',
            createdAt: Timestamp.now(),
        };

        await addDoc(collection(db, "appointments"), newAppointment);

        console.log("Appointment created successfully for lead:", data.leadId);
    } catch (error: any) {
        console.error("Error creating appointment:", error);
        throw new Error(error.message || "Could not create appointment in database.");
    }
}

export async function getScheduledSlotsForProperty(propertyId: string): Promise<{date: Date, time: string}[]> {
    try {
        const appointmentsCollection = collection(db, "appointments");
        const q = query(
            appointmentsCollection,
            where("propertyId", "==", propertyId),
            where("status", "==", "Scheduled")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as Appointment;
            return {
                date: (data.visitDate as Timestamp).toDate(),
                time: data.visitTime
            };
        });
    } catch (error) {
        console.error("Error fetching scheduled slots:", error);
        return [];
    }
}
