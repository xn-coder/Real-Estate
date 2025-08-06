
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

export type RewardTransaction = {
    id: string;
    date: Timestamp;
    type: 'Sent' | 'Claimed';
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    points: number;
    notes: string;
};
