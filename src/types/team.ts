
import type { Timestamp } from "firebase/firestore";

export type TeamRequest = {
    id: string;
    requesterId: string;
    requesterName: string;
    recipientId: string;
    recipientName: string;
    status: 'pending' | 'accepted' | 'rejected';
    requestedAt: Timestamp;
    respondedAt?: Timestamp;
};

export type SupportTicket = {
    id: string;
    userId: string;
    userName: string;
    category: 'Article' | 'Video' | 'FAQs' | 'T&C' | 'Property' | 'Other';
    itemId?: string; // ID of the resource or property
    itemTitle?: string;
    subject: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Closed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    resolutionDetails?: string;
};
