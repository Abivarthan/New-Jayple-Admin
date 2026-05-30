export type AdminRole = 'superadmin' | 'manager' | 'support';

export type AdminPermission =
  | 'vendors'
  | 'users'
  | 'zones'
  | 'uiconfig'
  | 'settlements'
  | 'content'
  | 'analytics'
  | 'admin-users'
  | 'audit';

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: string; // ISO String or Firestore timestamp serialized
  lastLoginAt: string;
  createdBy: string;
}

export type VendorStatus = 'pending' | 'approved' | 'active' | 'suspended' | 'blocked';
export type VendorTier = 'normal' | 'premium';

export interface VendorService {
  name: string;
  category: string;
  price: number;
  fakeDiscountPercent: number;
  isBestseller: boolean;
  isActive: boolean;
  sortOrder: number;
  imageAssetId: string;
}

export interface VendorBankAccount {
  accountNumber: string;
  ifscCode: string;
  holderName: string;
}

export interface VendorFinance {
  gstNumber?: string;
  panNumber?: string;
  bankAccount: VendorBankAccount;
  walletBalance: number;
  codCollected: number;
  codThreshold: number;
  isServiceBlocked: boolean;
}

export interface VendorMetrics {
  rating: number;
  totalBookings: number;
  completedBookings: number;
}

export interface Vendor {
  uid: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  status: VendorStatus;
  tier: VendorTier;
  commissionRate: number; // e.g. 15 for 15%
  coverImage: string;
  services: {
    [serviceId: string]: VendorService;
  };
  pincode: string;
  zoneId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  finance: VendorFinance;
  metrics: VendorMetrics;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface BookingService {
  serviceId: string;
  name: string;
  price: number;
}

export interface BookingPricing {
  grossAmount: number;
  discountAmount: number;
  walletApplied: number;
  convenienceFee: number;
  taxAmount: number;
  netPayable: number;
  vendorEarnings: number;
  commissionAmount: number;
}

export interface BookingCancellation {
  cancelledBy: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  reason: string;
  timestamp: string;
  penaltyApplied: number;
}

export interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vendorId: string;
  shopName: string;
  zoneId: string;
  services: BookingService[];
  pricing: BookingPricing;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
  };
  status: BookingStatus;
  dateTime: string;
  otp: string;
  cancellation?: BookingCancellation;
  createdAt: string;
}

export interface HeroSectionItem {
  title: string;
  subtitle: string;
  imageUrl: string;
  gifUrl?: string;
  gender: 'ALL' | 'MEN' | 'WOMEN';
  linkedServiceIds: string[];
  badgeText?: string;
}

export interface ServicesRowItem {
  iconUrl: string;
  label: string;
  gender: 'ALL' | 'MEN' | 'WOMEN';
  categoryId: string;
}

export interface UiConfig {
  zoneId: string;
  version: number;
  lastPublishedAt: string;
  lastPublishedBy: string;
  sectionOrder: string[];
  sections: {
    hero: {
      isActive: boolean;
      items: HeroSectionItem[];
    };
    sponsor: {
      isActive: boolean;
      mode: 'CURATED' | 'AUTO';
      curatedVendorIds?: string[];
      limit: number;
    };
    cashback: {
      isActive: boolean;
      headline: string;
      subtext: string;
      imageUrl: string;
      bgColor: string;
    };
    services: {
      isActive: boolean;
      items: ServicesRowItem[];
    };
  };
}

export interface AuditLog {
  logId: string;
  adminUid: string;
  adminName: string;
  adminRole: AdminRole;
  action: string;
  targetType: 'vendor' | 'user' | 'zone' | 'booking' | 'platformConfig' | 'adminUser';
  targetId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface WeeklyLedger {
  vendorId: string;
  weekKey: string; // YYYY-Www
  grossEarnings: number;
  commissionPaid: number;
  codCollected: number;
  walletAdjustments: number;
  netPayoutDue: number;
  settlementStatus: 'PENDING' | 'CARRIED_FORWARD' | 'PAID';
  settlementId?: string;
}

// ==========================================
// CMS Types
// ==========================================

export interface CMSHeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  gifUrl: string | null;
  ctaText: string;
  ctaAction: string;
  genderTarget: "all" | "men" | "women";
  zones: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSPromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaAction: string;
  zones: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSReferralConfig {
  headline: string;
  subHeadline: string;
  imageUrl: string;
  buttonText: string;
  buttonAction: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSCashbackConfig {
  headline: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSStaticPage {
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSAnnouncement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  zones: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CMSSettings {
  version: number;
  lastPublishedAt: string;
  lastPublishedBy: string;
}
