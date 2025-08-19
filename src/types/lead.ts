
import type { Timestamp } from "firebase/firestore";

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Forwarded' | 'Pending' | 'Processing' | 'Completed' | 'Link Share' | 'In Progress' | 'Sale' | 'Partially Completed' | 'Sale Completed' | 'Application Rejected' | 'Lead Expired';

export type DealStatus = 'New lead' | 'Contacted' | 'Interested' | 'site visit scheduled' | 'site visit done' | 'negotiation in progress' | 'booking form filled' | 'booking amount received' | 'property reserved' | 'kyc documents collected' | 'agreement drafted' | 'agreement signed' | 'part payment pending' | 'payment in progress' | 'registration done' | 'handover/possession given' | 'booking cancelled';

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
    status: LeadStatus;
    dealStatus: DealStatus;
    createdAt: Date | Timestamp;
    forwardedTo?: {
        partnerId: string;
        partnerName: string;
        leadCopyId: string;
    } | null;
    isCopy?: boolean;
    originalLeadId?: string;
};
