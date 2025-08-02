
export type FaqItem = {
    question: string;
    answer: string;
};

export type Resource = {
    id: string;
    title: string;
    categoryId: string;
    contentType: "article" | "video" | "faq";
    featureImage: string;
    articleContent: string | null;
    videoUrl: string | null;
    faqs: FaqItem[] | null;
    createdAt: Date;
};

export type Category = {
    id: string;
    name: string;
};
