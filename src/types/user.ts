
export type User = {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone: string
  role: string
  profileImage?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  qualification?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  businessLogo?: string;
  businessType?: string;
  gstn?: string;
  businessAge?: number;
  areaCovered?: string;
  aadharNumber?: string;
  aadharFile?: string;
  panNumber?: string;
  panFile?: string;
  permissions?: string[];
}
