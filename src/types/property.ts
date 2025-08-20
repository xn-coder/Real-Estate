
import type { Timestamp } from "firebase/firestore";

type Slide = {
    id?: string;
    title: string;
    image: string; // This will now store the URL from Firebase Storage
};

export type EarningRuleValue = {
    type: "reward_points" | "commission_percentage" | "flat_amount" | "per_sq_ft";
    value: number;
    totalSqFt?: number;
}

export type Property = {
    id: string;
    status: 'Pending Verification' | 'For Sale' | 'Under Contract' | 'Sold';

    // Step 1
    catalogTitle: string;
    catalogMetaDescription: string;
    catalogMetaKeyword: string;
    propertyCategory: "Residential" | "Commercial" | "Land" | "Industrial" | "Agriculture" | "Rental" | "Other";
    propertyTypeId: string;
    propertyAge: "New" | "<1 year" | "1 - 5 years" | "5 - 10 years" | "10+ years";
    reraApproved: boolean;
    featureImage: string; // Changed from featureImageId to store URL
    catalogType: "New Project" | "Project" | "Resales" | "Rental" | "Other";

    // Step 2
    slides: Slide[];

    // Step 3
    overview: string;

    // Step 4
    builtUpArea?: number;
    isBuiltUpAreaEnabled: boolean;
    carpetArea?: number;
    isCarpetAreaEnabled: boolean;
    superBuiltUpArea?: number;
    isSuperBuiltUpAreaEnabled: boolean;
    unitOfMeasurement: "sq. ft" | "sq. m" | "acres" | "other";
    totalFloors?: number;
    isTotalFloorsEnabled: boolean;
    floorNumber?: number;
    isFloorNumberEnabled: boolean;
    bedrooms?: number;
    isBedroomsEnabled: boolean;
    bathrooms?: number;
    isBathroomsEnabled: boolean;
    balconies?: number;
    isBalconiesEnabled: boolean;
    servantRoom: boolean;
    parkingSpaces?: number;
    isParkingSpacesEnabled: boolean;

    // Step 5
    amenities?: string[];

    // Step 6
    furnishingStatus: "fully" | "semi" | "unfurnished";
    flooringType: "vitrified" | "marble" | "wood" | "other";
    kitchenType: "modular" | "normal";
    furnitureIncluded?: string;

    // Step 7
    locality: string;
    addressLine: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    landmark?: string;
    latitude?: string;
    longitude?: string;

    // Step 8
    busStop?: string;
    metroStation?: string;
    hospitalDistance?: string;
    mallDistance?: string;
    airportDistance?: string;
    schoolDistance?: string;
    otherConnectivity?: string;

    // Step 9
    listingPrice: number;
    priceType: "fixed" | "negotiable" | "auction";
    maintenanceCharge: number;
    securityDeposit: number;
    bookingAmount: number;
    registrationCharge: number;
    loanAvailable: boolean;

    // Step 10
    listedBy: "Owner" | "Agent" | "Builder" | "Team";
    name: string;
    phone: string;
    altPhone?: string;
    email: string;
    agencyName?: string;
    reraId?: string;
    contactTime: "Morning" | "Afternoon" | "Evening";
    
    // Earning Rules
    earningRules?: {
        affiliate?: EarningRuleValue;
        super_affiliate?: EarningRuleValue;
        associate?: EarningRuleValue;
        channel?: EarningRuleValue;
        franchisee?: EarningRuleValue;
    };


    // Admin fields
    createdAt?: Date | Timestamp;
    views?: number;
    modificationNotes?: string;
    ownerId?: string;
};
