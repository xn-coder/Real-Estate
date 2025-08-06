
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
