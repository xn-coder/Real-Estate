
export type UserDocument = {
    id: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    ownerId?: string; // Add this line
};
