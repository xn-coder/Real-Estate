
import type { Timestamp } from "firebase/firestore";

export type WithdrawalRequest = {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    requestedAt: Date | Timestamp;
    processedAt?: Date | Timestamp;
    notes?: string;
};
