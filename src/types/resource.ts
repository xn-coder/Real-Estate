
import type { Timestamp } from "firebase/firestore";

export type FaqItem = {
    question: string;
    answer: string;
};

export type Resource = {
    id: string;
    title: string;
    propertyTypeId: string;
    contentType: "article" | "video" | "faq" | "terms_condition";
    featureImage: string;
    articleContent: string | null;
    videoUrl: string | null;
    faqs: FaqItem[] | null;
    createdAt: Date | Timestamp;
};

export type PropertyType = {
    id: string;
    name: string;
};
