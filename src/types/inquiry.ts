
import type { Timestamp } from "firebase/firestore";

export type Inquiry = {
    id: string;
    partnerId: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    createdAt: Date;
    status: 'New' | 'Contacted' | 'Closed';
};
