
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

export type Wallet = {
    balance: number;
    revenue: number;
    receivable: number;
    payable: number;
    rewardBalance?: number;
};

export type Receivable = {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    date: Date | Timestamp;
    status: 'Pending' | 'Paid' | 'Overdue';
    notes?: string;
};
