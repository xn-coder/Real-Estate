
import type { Timestamp } from "firebase/firestore";

export type Appointment = {
    id: string;
    leadId: string;
    propertyId: string;
    partnerId: string;
    customerId: string;
    visitDate: Date | Timestamp;
    status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending Verification' | 'Rejected';
    createdAt: Date | Timestamp;
    notes?: string;
    visitProofUrl?: string;
};
