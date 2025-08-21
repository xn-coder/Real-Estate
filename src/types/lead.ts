
import type { Timestamp } from "firebase/firestore";

export type LeadStatus = 'New lead' | 'Contacted' | 'Interested' | 'Site visit scheduled' | 'Site visited' | 'In negotiation' | 'Booking confirmed' | 'Deal closed' | 'Follow-up required' | 'Lost lead' | 'Forwarded' | 'Document Submitted';

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
    closingAmount?: number;
    forwardedTo?: {
        partnerId: string;
        partnerName: string;
        leadCopyId: string;
    } | null;
    isCopy?: boolean;
    originalLeadId?: string;
};
