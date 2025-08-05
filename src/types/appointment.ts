
import type { Timestamp } from "firebase/firestore";

export type Appointment = {
    id: string;
    leadId: string;
    propertyId: string;
    partnerId: string;
    visitDate: Date | Timestamp;
    status: 'Scheduled' | 'Completed' | 'Cancelled';
    createdAt: Date | Timestamp;
    notes?: string;
};
