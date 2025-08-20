
import type { Timestamp } from "firebase/firestore";
import type { DealStatus } from "./lead";

export type User = {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone: string
  password?: string
  whatsappNumber?: string;
  role: string
  status?: 'active' | 'inactive' | 'pending' | 'pending_approval' | 'rejected' | 'suspended' | 'pending_verification' | DealStatus;
  profileImage?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  qualification?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  businessName?: string;
  businessLogo?: string;
  businessType?: string;
  gstn?: string;
  businessAge?: number;
  areaCovered?: string;
  aadharNumber?: string;
  aadharFile?: string;
  panNumber?: string;
  panFile?: string;
  reraCertificate?: string;
  permissions?: string[];
  paymentStatus?: 'paid' | 'pending' | 'pending_approval' | 'not_required' | 'failed';
  paymentProof?: string;
  paymentTransactionId?: string;
  deactivationReason?: string;
  reactivationReason?: string;
  rejectionReason?: string;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  teamLeadId?: string | null;
  createdAt?: Timestamp;
  website?: {
    businessProfile?: {
        businessName: string;
        businessLogo: string;
    };
    slideshow?: {
      id: string;
      title: string;
      bannerImage: string;
      linkUrl: string;
      showOnPartnerDashboard?: boolean;
      showOnPartnerWebsite?: boolean;
    }[];
    featuredCatalog?: string[];
    contactDetails?: {
        name: string;
        phone: string;
        email: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
    },
    aboutLegal?: {
      aboutText: string;
      termsLink: string;
      privacyLink: string;
      disclaimerLink: string;
    };
    socialLinks?: {
      website: string;
      instagram: string;
      facebook: string;
      youtube: string;
      twitter: string;
      linkedin: string;
    }
  }
}
