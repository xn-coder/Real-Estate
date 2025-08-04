
export type Message = {
    id: string;
    senderId: string;
    senderName: string;
    recipientId: string; // Can be a user ID or a group like 'ALL_PARTNERS'
    recipientName: string; // Name of user or group
    subject: string;
    body: string; // HTML content from rich text editor
    date: Date;
    isAnnouncement: boolean;
    readBy: { [userId: string]: boolean }; // Map of user IDs to read status
};
