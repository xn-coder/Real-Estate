
import type { Timestamp } from "firebase/firestore";

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Forwarded' | 'Pending' | 'Processing' | 'Completed' | 'Link Share' | 'In Progress' | 'Sale' | 'Partially Completed' | 'Sale Completed' | 'Application Rejected' | 'Lead Expired';

export type ApplicationStatus = 'Application Not Started' | 'Application Incompleted' | 'Documentation Pending' | 'KYC Pending' | 'Payment Pending' | 'Approval Pending from Brand' | 'Activation Pending' | 'Packed' | 'Shipped' | 'Out of Delivery' | 'Delivered' | 'Failed Attempt' | 'Returned' | 'Cancelled';

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
    applicationStatus: ApplicationStatus;
    createdAt: Date | Timestamp;
    forwardedTo?: {
        partnerId: string;
        partnerName: string;
        leadCopyId: string;
    } | null;
    isCopy?: boolean;
    originalLeadId?: string;
};
