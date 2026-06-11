import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../../shared/services/firebase';
import { s, n, b, toMillis } from '../../../shared/utils/firestore.helpers';

const functions = getFunctions(app, 'asia-south1');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminVendor {
  uid: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  zoneName: string;
  tier: 'premium' | 'normal';
  status: 'active' | 'pending' | 'suspended' | 'blocked';
  rating: number;
  reviewCount: number;
  bookingsCount: number;
  weeklyEarnings: number;
  isGstRegistered: boolean;
  email?: string;
  address?: string;
  gstNumber?: string;
  commissionRate?: number;
}

export interface AdminVendorRequest {
  uid: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  pincode: string;
  submittedAt: number | null;
  gstNumber: string;
}

export interface AdminVendorBooking {
  id: string;
  customerName: string;
  services: string[];
  dateTime: string;
  amount: number;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  paymentMethod: 'ONLINE' | 'COD';
}

export interface AdminVendorReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  flagged: boolean;
}

export interface AdminVendorService {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function fetchWalletBalance(vendorId: string): Promise<number> {
  try {
    const w = await getDoc(doc(db, 'vendors', vendorId, 'wallet', 'main'));
    return w.exists() ? n((w.data() as Record<string, unknown>).balance) : 0;
  } catch {
    return 0;
  }
}

export function normVendorStatus(x: Record<string, unknown>): AdminVendor['status'] {
  const st = s(x.status).toLowerCase();
  if (st === 'suspended') return 'suspended';
  if (st === 'blocked') return 'blocked';
  if (st === 'pending' || st === 'pending_approval') return 'pending';
  if (st === 'active' || st === 'approved') return 'active';
  return b(x.isActive) ? 'active' : 'pending';
}

function mapBkStatus(st: string): AdminVendorBooking['status'] {
  const x = st.toLowerCase();
  if (x === 'completed' || x === 'reviewed') return 'COMPLETED';
  if (x === 'cancelled' || x === 'rejected' || x === 'failed') return 'CANCELLED';
  return 'CONFIRMED';
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const fetchVendors = async (): Promise<AdminVendor[]> => {
  const snap = await getDocs(collection(db, 'vendors'));
  return Promise.all(
    snap.docs.map(async (d) => {
      const x = d.data() as Record<string, unknown>;
      const walletBalance = await fetchWalletBalance(d.id);
      return {
        uid: d.id,
        shopName: s(x.shopName) || s(x.businessName) || s(x.name) || 'Unnamed Shop',
        ownerName: s(x.ownerName) || s(x.name) || '—',
        phone: s(x.phone) || s(x.phoneNumber),
        city: s(x.city) || s(x.area),
        zoneName: s(x.zoneName) || s(x.city) || '—',
        tier: b(x.isBridalCertified) ? 'premium' : 'normal',
        status: normVendorStatus(x),
        rating: n(x.rating) || n(x.avgRating),
        reviewCount: n(x.reviewCount) || n(x.totalReviewCount) || n(x.totalReviews),
        bookingsCount: n(x.completedBookings) || n(x.bookingsCount),
        weeklyEarnings: walletBalance,
        isGstRegistered: b(x.isGstRegistered) || !!s(x.gstNumber),
      };
    }),
  );
};

export const fetchVendorById = async (uid: string): Promise<AdminVendor | null> => {
  const d = await getDoc(doc(db, 'vendors', uid));
  if (!d.exists()) return null;
  const x = d.data() as Record<string, unknown>;
  const walletBalance = await fetchWalletBalance(uid);
  return {
    uid: d.id,
    shopName: s(x.shopName) || s(x.businessName) || s(x.name) || 'Unnamed Shop',
    ownerName: s(x.ownerName) || s(x.name) || '—',
    phone: s(x.phone) || s(x.phoneNumber),
    city: s(x.city) || s(x.area),
    zoneName: s(x.zoneName) || s(x.city) || '—',
    tier: b(x.isBridalCertified) ? 'premium' : 'normal',
    status: normVendorStatus(x),
    rating: n(x.rating) || n(x.avgRating),
    reviewCount: n(x.reviewCount) || n(x.totalReviewCount) || n(x.totalReviews),
    bookingsCount: n(x.completedBookings) || n(x.bookingsCount),
    weeklyEarnings: walletBalance,
    isGstRegistered: b(x.isGstRegistered) || !!s(x.gstNumber),
    email: s(x.email),
    address: s(x.address) || s(x.formattedAddress),
    gstNumber: s(x.gstNumber),
    commissionRate: n(x.commissionRate, 15),
  };
};

export const fetchVendorRequests = async (): Promise<AdminVendorRequest[]> => {
  const out: AdminVendorRequest[] = [];
  try {
    const snap = await getDocs(collection(db, 'vendorRegistrationRequests'));
    snap.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      out.push({
        uid: d.id,
        shopName: s(x.shopName) || s(x.businessName) || s(x.name) || 'Unnamed Shop',
        ownerName: s(x.ownerName) || s(x.name) || '—',
        phone: s(x.phone) || s(x.phoneNumber),
        city: s(x.city) || s(x.area),
        pincode: s(x.pincode) || s(x.pinCode),
        submittedAt: toMillis(x.createdAt ?? x.submittedAt),
        gstNumber: s(x.gstNumber),
      });
    });
  } catch { /* ignore */ }
  if (out.length === 0) {
    const q = query(collection(db, 'vendors'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      out.push({
        uid: d.id,
        shopName: s(x.shopName) || s(x.businessName) || s(x.name) || 'Unnamed Shop',
        ownerName: s(x.ownerName) || s(x.name) || '—',
        phone: s(x.phone) || s(x.phoneNumber),
        city: s(x.city) || s(x.area),
        pincode: s(x.pincode) || s(x.pinCode),
        submittedAt: toMillis(x.createdAt),
        gstNumber: s(x.gstNumber),
      });
    });
  }
  return out;
};

export const fetchVendorBookings = async (vendorId: string): Promise<AdminVendorBooking[]> => {
  const out: AdminVendorBooking[] = [];
  try {
    const snap = await getDocs(query(collection(db, 'bookings'), where('vendorId', '==', vendorId), limit(50)));
    snap.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      const svc = Array.isArray(x.services)
        ? (x.services as Record<string, unknown>[]).map((sv) => s(sv.serviceName) || s(sv.name)).filter(Boolean)
        : [];
      const at = toMillis(x.createdAt ?? x.scheduledDate);
      const pm = s(x.paymentMethod).toLowerCase();
      out.push({
        id: d.id,
        customerName: s(x.customerName) || s(x.userName) || 'Customer',
        services: svc,
        dateTime: at ? new Date(at).toLocaleString() : '—',
        amount: n(x.totalAmount) || n(x.servicePrice),
        status: mapBkStatus(s(x.status)),
        paymentMethod: pm === 'cash' || pm === 'cod' ? 'COD' : 'ONLINE',
      });
    });
  } catch { /* missing index/permission */ }
  return out;
};

export const fetchVendorReviews = async (vendorId: string): Promise<AdminVendorReview[]> => {
  const out: AdminVendorReview[] = [];
  try {
    const snap = await getDocs(query(collection(db, 'reviews'), where('vendorId', '==', vendorId), limit(50)));
    snap.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      const at = toMillis(x.createdAt);
      out.push({
        id: d.id,
        customerName: s(x.customerName) || s(x.userName) || 'Customer',
        rating: n(x.rating),
        comment: s(x.comment) || s(x.review),
        date: at ? new Date(at).toLocaleDateString() : '—',
        flagged: b(x.flagged) || b(x.isFlagged),
      });
    });
  } catch { /* missing index/permission */ }
  return out;
};

export const fetchVendorServices = async (vendorId: string): Promise<AdminVendorService[]> => {
  const out: AdminVendorService[] = [];
  try {
    const snap = await getDocs(collection(db, 'vendors', vendorId, 'services'));
    snap.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      out.push({
        id: d.id,
        name: s(x.name) || 'Service',
        category: s(x.category) || s(x.imageCategory),
        price: n(x.price) || n(x.vendorPrice),
        isActive: x.isActive !== false,
      });
    });
  } catch { /* none */ }
  return out;
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const setVendorStatus = async (
  uid: string,
  status: AdminVendor['status'],
  reason?: string,
): Promise<void> => {
  await updateDoc(doc(db, 'vendors', uid), {
    status,
    isActive: status === 'active',
    ...(reason ? { statusReason: reason } : {}),
    statusUpdatedAt: serverTimestamp(),
  });
};

export const approveVendor = (uid: string) => setVendorStatus(uid, 'active');
export const rejectVendor = (uid: string, reason?: string) =>
  setVendorStatus(uid, 'blocked', reason || 'Rejected during onboarding');

export const updateVendorBasics = async (
  uid: string,
  fields: { shopName?: string; ownerName?: string; phone?: string; email?: string; address?: string },
): Promise<void> => {
  const u: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (fields.shopName !== undefined) { u.shopName = fields.shopName; u.businessName = fields.shopName; u.name = fields.shopName; }
  if (fields.ownerName !== undefined) u.ownerName = fields.ownerName;
  if (fields.phone !== undefined) u.phone = fields.phone;
  if (fields.email !== undefined) u.email = fields.email;
  if (fields.address !== undefined) u.address = fields.address;
  await updateDoc(doc(db, 'vendors', uid), u);
};

export const setReviewFlag = async (reviewId: string, flagged: boolean): Promise<void> => {
  await updateDoc(doc(db, 'reviews', reviewId), { flagged, flaggedAt: serverTimestamp() });
};

const _recomputeAllVendorRatings = httpsCallable<Record<string, never>, { ok: boolean; vendorsProcessed: number }>(
  functions, 'recomputeAllVendorRatings',
);
export const recomputeAllVendorRatings = () => _recomputeAllVendorRatings({});
