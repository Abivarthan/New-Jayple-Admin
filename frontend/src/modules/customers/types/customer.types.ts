export interface CustomerDetails {
  uid: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  pincode: string;
  walletBalance: number;
  bookingsCount: number;
  status: 'active' | 'locked';
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  joinedAt: number | null;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  lifetimeValue: number;
  averageOrderValue: number;
  addresses: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  addressLine: string;
  city: string;
  pincode: string;
  location?: { lat: number; lng: number };
}

export interface CustomerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpend: number;
  lifetimeValue: number;
  averageOrderValue: number;
}

export interface CustomerBooking {
  id: string;
  service: string;
  vendor: string;
  date: string;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  amount: number;
}

export interface CustomerActivity {
  id: string;
  type: 'registration' | 'profile_update' | 'booking_created' | 'payment' | 'complaint' | 'refund_request';
  title: string;
  description: string;
  timestamp: string;
}

export interface CustomerPayment {
  id: string;
  dateTime: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface CustomerSupportTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'CLOSED' | 'ESCALATED';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}
