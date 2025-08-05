
import type { Timestamp } from "firebase/firestore";

export type Lead = {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    propertyId: string;
    partnerId: string;
    customerId: string;
    status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
    createdAt: Date | Timestamp;
};
