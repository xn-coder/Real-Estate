
import type { Timestamp } from "firebase/firestore";

export type Requirement = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    propertyType: string;
    preferredLocation: string;
    minBudget: number;
    maxBudget: number;
    minSize: number;
    maxSize: number;
    furnishing: "unfurnished" | "semi-furnished" | "fully-furnished";
    amenities?: string[];
    createdAt: Date | Timestamp;
}
