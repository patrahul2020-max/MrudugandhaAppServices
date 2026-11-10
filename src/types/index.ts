export type ReferralChannel =
  | 'Social Media'
  | 'Airbnb'
  | 'Booking.com'
  | 'MakeMyTrip (MMT)'
  | 'Google Search / Maps'
  | 'Reference / Word of Mouth'
  | 'Existing Guest / Repeat'
  | 'Agents / Travel Partner'
  | string;

export type BalanceStatus = 'Pending' | 'Paid in Cash' | 'Paid via UPI' | 'Partial';

export type CheckInStatus = 'Upcoming' | 'Active / Checked-in' | 'Checked-out' | 'Cancelled';

export type PaymentMode = 'Cash' | 'UPI' | 'Net Banking' | 'Card';

export type ExpenseCategory =
  | 'SALARY'
  | 'TRAVEL'
  | 'FOOD & DINNING'
  | 'GROCERY'
  | 'MEAT'
  | 'VEGETABLES'
  | 'ELECTRICITY BILL'
  | 'WATER BILL'
  | 'TAX'
  | 'G.H. MAINTENANCE'
  | 'TOILETORIES'
  | 'GADGETS'
  | 'PERSONAL'
  | 'HEALTH CARE'
  | 'SINKING FUND'
  | 'SOCIETY MAINTENANCE'
  | 'MISC'
  | string;

export interface Booking {
  id: string;
  srNo: number;
  referralSource: ReferralChannel;
  guestName: string;
  phone: string;
  address: string;
  city?: string;
  notes?: string;
  idProofType: 'Aadhaar Card' | 'Passport' | 'Driving License' | 'Voter ID' | 'Other';
  idProofNumber: string;
  idProofFileUrl?: string; // base64 or object URL
  adults: number; // adults and guests above 12 yrs
  children: number; // children 5 to 12 yrs
  infants?: number; // children below 5 yrs (complimentary / 0 charge)
  unitAllotted: string; // e.g. Full Villa, Ground Floor, First Floor, Cottage 1, Cottage 2
  bookingDate: string; // YYYY-MM-DD
  checkInDate: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm, default "13:00"
  checkOutDate: string; // YYYY-MM-DD
  checkOutTime: string; // HH:mm, default "11:00"
  stayDays: number; // auto-calculated
  totalAmount: number; // ₹ Total Amount Payable
  advancePaid: number; // ₹ Advance Paid
  balanceAmount: number; // ₹ Auto-calculated: totalAmount - advancePaid
  balanceStatus: BalanceStatus;
  commission: number; // ₹ Commission paid/payable to channel
  serviceCharges: number; // ₹ Laundry, extra bed, food, etc.
  status: CheckInStatus;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number; // ₹
  paymentMode: PaymentMode;
  description: string;
  receiptUrl?: string; // base64 or file URL
  createdAt: string;
  recordedBy?: string;
  lastModifiedAt?: string;
}

export interface UnitConfig {
  id: string;
  name: string;
  baseCapacity?: number; // fixed occupancy covered in base rate
  capacityAdults?: number;
  capacityChildren?: number;
  baseRatePerNight: number;
  extraAdultRate?: number; // per extra adult (12+ yrs) per night
  extraChildRate?: number; // per extra child (5-12 yrs) per night
  description?: string;
  isActive: boolean;
}

export interface PropertySettings {
  propertyName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstNumber?: string;
  panNumber?: string;
  upiId?: string;
  bankDetails?: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  units: UnitConfig[];
  customChannels: string[];
  currencySymbol: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

export type DocumentCategory = 'Invoice' | 'Check-in Slip' | 'ID Proof' | 'Client Document' | 'Other';

export interface StoredDocument {
  id: string;
  bookingId?: string;
  bookingSrNo?: number;
  guestName: string;
  guestPhone?: string;
  documentType: DocumentCategory;
  title: string;
  fileUrl: string; // base64 or URL
  fileType: string; // 'application/pdf' | 'image/png' | 'image/jpeg' | string
  fileSize?: string;
  createdAt: string; // ISO date string
  bookingDate?: string; // YYYY-MM-DD
  notes?: string;
  uploadedBy?: string;
}
