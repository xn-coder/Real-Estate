
import type { Timestamp } from "firebase/firestore";

export type FaqItem = {
    question: string;
    answer: string;
};

export type Resource = {
    id: string;
    title: string;
    propertyId: string | null;
    propertyTitle?: string; // For display, not in DB
    contentType: "article" | "video" | "faq" | "terms_condition";
    featureImage: string;
    articleContent: string | null;
    videoUrl: string | null;
    faqs: FaqItem[] | null;
    createdAt: Date | Timestamp;
    ownerId?: string;
};

export type PropertyType = {
    id: string;
    name: string;
};
