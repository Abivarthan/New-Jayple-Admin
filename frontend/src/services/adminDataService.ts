import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';

const functions = getFunctions(app, 'asia-south1');

// ── Helpers ──
const s = (v: unknown, d = ''): string => (typeof v === 'string' && v ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === 'number' && isFinite(v) ? v : d);
const b = (v: unknown): boolean => v === true;
function toMillis(v: unknown): number | null {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// REFUND CASES — vendor-rejected bookings awaiting MANUAL refund.
// (Vendor reject leaves the booking at refundStatus='pending_admin' with an
//  online/card portion the admin pays manually + a wallet portion credited
//  by markRefundProcessed when the admin marks it done.)
// ══════════════════════════════════════════════════════════════
export interface RefundCase {
  id: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  vendorName: string;
  vendorPhone: string;
  vendorId: string;
  serviceNames: string;
  slotDate: string;
  slotTime: string;
  servicePrice: number;
  convenienceFee: number;
  refundOnlineAmount: number;
  refundWalletAmount: number;
  refundAmount: number;
  refundStatus: string; // 'pending_admin' | 'refunded'
  rejectedAt: number | null;
}

export async function fetchRefundCases(): Promise<RefundCase[]> {
  const snap = await getDocs(query(
    collection(db, 'bookings'),
    where('refundStatus', 'in', ['pending_admin', 'refunded']),
  ));
  const rows: RefundCase[] = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const services = Array.isArray(x.services) ? (x.services as Record<string, unknown>[]) : [];
    const serviceNames = services.map((sv) => s(sv.serviceName) || s(sv.name)).filter(Boolean).join(', ');
    return {
      id: d.id,
      customerName: s(x.customerName) || s(x.userName) || 'Customer',
      customerPhone: s(x.customerPhone) || s(x.userPhone),
      customerId: s(x.userId) || s(x.customerId),
      vendorName: s(x.shopName) || s(x.vendorName) || 'Salon',
      vendorPhone: s(x.vendorPhone),
      vendorId: s(x.vendorId),
      serviceNames: serviceNames || 'services',
      slotDate: s(x.slotDate) || s(x.scheduledDate),
      slotTime: s(x.slotTime) || s(x.startTime),
      servicePrice: n(x.servicePrice),
      convenienceFee: n(x.convenienceFee),
      refundOnlineAmount: n(x.refundOnlineAmount),
      refundWalletAmount: n(x.refundWalletAmount),
      refundAmount: n(x.refundAmount),
      refundStatus: s(x.refundStatus, 'pending_admin'),
      rejectedAt: toMillis(x.rejectedAt),
    };
  });
  rows.sort((a, c) => {
    if (a.refundStatus !== c.refundStatus) return a.refundStatus === 'pending_admin' ? -1 : 1;
    return (c.rejectedAt || 0) - (a.rejectedAt || 0);
  });
  return rows;
}

const _markRefundProcessed = httpsCallable<{ bookingId: string }, { ok: boolean; walletCredited?: number }>(
  functions, 'markRefundProcessed',
);
export async function markRefundProcessed(bookingId: string): Promise<{ ok: boolean; walletCredited?: number }> {
  const res = await _markRefundProcessed({ bookingId });
  return res.data;
}

// One-shot maintenance: recompute every vendor's rating + reviewCount from their
// reviews subcollection (heals data that predates the aggregateVendorRating
// trigger). Idempotent — safe to re-run.
const _recomputeAllVendorRatings = httpsCallable<Record<string, never>, { ok: boolean; vendorsProcessed: number }>(
  functions, 'recomputeAllVendorRatings',
);
export async function recomputeAllVendorRatings(): Promise<{ ok: boolean; vendorsProcessed: number }> {
  const res = await _recomputeAllVendorRatings({});
  return res.data;
}

// ══════════════════════════════════════════════════════════════
// BOOKING MONITOR + AUTO-ACCEPTED REVIEW
// ══════════════════════════════════════════════════════════════
export interface AdminBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  vendorName: string;
  vendorPhone: string;
  serviceNames: string;
  slotDate: string;
  slotTime: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  onlineAmount: number;
  cashAmount: number;
  walletUsed: number;
  autoAccepted: boolean;
  adminReviewed: boolean;
  rescheduled: boolean;
  callStatus: string;
  oneHourAlert: boolean;
  createdAt: number | null;
}

function mapBooking(id: string, x: Record<string, unknown>): AdminBooking {
  const services = Array.isArray(x.services) ? (x.services as Record<string, unknown>[]) : [];
  const serviceNames = services.map((sv) => s(sv.serviceName) || s(sv.name)).filter(Boolean).join(', ');
  const conv = n(x.convenienceFee);
  const total = n(x.totalAmount);
  const service = n(x.servicePrice) || Math.max(0, total - conv);
  const walletUsed = n(x.walletDiscount) || n(x.walletDiscountAmount);
  const isCod = s(x.paymentMethod) === 'cod' || s(x.paymentMethod) === 'cash';
  return {
    id,
    customerName: s(x.customerName) || s(x.userName) || 'Customer',
    customerPhone: s(x.customerPhone) || s(x.userPhone),
    vendorName: s(x.shopName) || s(x.vendorName) || 'Salon',
    vendorPhone: s(x.vendorPhone),
    serviceNames: serviceNames || 'services',
    slotDate: s(x.slotDate) || s(x.scheduledDate),
    slotTime: s(x.slotTime) || s(x.startTime),
    status: s(x.status, 'unknown'),
    paymentMethod: s(x.paymentMethod, '—'),
    totalAmount: total,
    onlineAmount: isCod ? conv : Math.max(0, total - walletUsed),
    cashAmount: isCod ? Math.max(0, service - walletUsed) : 0,
    walletUsed,
    autoAccepted: b(x.autoAccepted),
    adminReviewed: b(x.adminReviewed),
    rescheduled: b(x.rescheduled) || n(x.rescheduleCount) > 0,
    callStatus: s(x.callStatus, 'pending'),
    oneHourAlert: b(x.oneHourAlert),
    createdAt: toMillis(x.createdAt),
  };
}

// ── Admin booking actions (cancel / reschedule / call-status) ──
const _adminCancelBooking = httpsCallable<{ bookingId: string; reason?: string }, { ok?: boolean; refundAmount?: number }>(
  functions, 'adminCancelBooking');
export async function adminCancelBooking(bookingId: string, reason?: string) {
  return (await _adminCancelBooking({ bookingId, reason })).data;
}
const _rescheduleBookingFn = httpsCallable<{ bookingId: string; newSlotDate: string; newSlotTime: string }, { bookingId?: string }>(
  functions, 'rescheduleBooking');
export async function adminRescheduleBooking(bookingId: string, newSlotDate: string, newSlotTime: string) {
  return (await _rescheduleBookingFn({ bookingId, newSlotDate, newSlotTime })).data;
}
const _setBookingCallStatus = httpsCallable<{ bookingId: string; callStatus: string; callStage?: string; note?: string }, { ok: boolean }>(
  functions, 'setBookingCallStatus');
export async function setBookingCallStatus(bookingId: string, callStatus: string, callStage?: string, note?: string) {
  return (await _setBookingCallStatus({ bookingId, callStatus, callStage, note })).data;
}

// Call workflow: confirmed bookings (post-confirmation calls + 1-hour-before alerts).
export async function fetchCallWorkflow(): Promise<AdminBooking[]> {
  const snap = await getDocs(query(collection(db, 'bookings'), where('status', '==', 'confirmed')));
  const rows = snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  // 1-hour-alert + not-yet-called first; then newest.
  rows.sort((a, c) => {
    const ap = (a.oneHourAlert ? 0 : 1) + (a.callStatus === 'pending' ? 0 : 2);
    const cp = (c.oneHourAlert ? 0 : 1) + (c.callStatus === 'pending' ? 0 : 2);
    if (ap !== cp) return ap - cp;
    return (c.createdAt || 0) - (a.createdAt || 0);
  });
  return rows;
}

export async function fetchBookingsMonitor(max = 200): Promise<AdminBooking[]> {
  const snap = await getDocs(query(
    collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(max),
  ));
  return snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
}

export async function fetchAutoAcceptedReview(): Promise<AdminBooking[]> {
  const snap = await getDocs(query(
    collection(db, 'bookings'), where('autoAccepted', '==', true),
  ));
  const rows = snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  // unreviewed first, newest first
  rows.sort((a, c) => {
    if (a.adminReviewed !== c.adminReviewed) return a.adminReviewed ? 1 : -1;
    return (c.createdAt || 0) - (a.createdAt || 0);
  });
  return rows;
}

const _confirmAutoAccepted = httpsCallable<{ bookingId: string }, { ok: boolean }>(
  functions, 'confirmAutoAcceptedBooking',
);
export async function confirmAutoAccepted(bookingId: string): Promise<{ ok: boolean }> {
  return (await _confirmAutoAccepted({ bookingId })).data;
}

// ── Delayed services (confirmed, slot+grace passed, service not started) ──
function slotMillis(date: string, time: string): number | null {
  if (!date || !time) return null;
  const t = Date.parse(`${date}T${time.length === 5 ? time + ':00' : time}+05:30`);
  return isNaN(t) ? null : t;
}
export async function fetchDelayedServices(graceMin = 15): Promise<AdminBooking[]> {
  const snap = await getDocs(query(collection(db, 'bookings'), where('status', '==', 'confirmed')));
  const now = Date.now();
  return snap.docs
    .map((d) => ({ raw: d.data() as Record<string, unknown>, b: mapBooking(d.id, d.data() as Record<string, unknown>) }))
    .filter(({ raw, b: bk }) => {
      const sm = slotMillis(bk.slotDate, bk.slotTime);
      const started = !!raw.startedAt || raw.otpVerified === true;
      return sm != null && !started && now > sm + graceMin * 60000;
    })
    .map(({ b: bk }) => bk)
    .sort((a, c) => (slotMillis(a.slotDate, a.slotTime) || 0) - (slotMillis(c.slotDate, c.slotTime) || 0));
}

// ── Fraud flags: vendors with >50% last-minute cancellations this week ──
export interface FraudFlag {
  vendorId: string;
  vendorName: string;
  totalBookings: number;
  lastMinuteCancels: number;
  ratio: number;
}
export async function fetchFraudFlags(minSample = 4): Promise<FraudFlag[]> {
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(1500)));
  const agg = new Map<string, { name: string; total: number; lmc: number }>();
  snap.docs.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const created = toMillis(x.createdAt);
    if (created == null || created < weekStart) return;
    const vid = s(x.vendorId); if (!vid) return;
    const e = agg.get(vid) || { name: s(x.shopName) || s(x.vendorName) || 'Salon', total: 0, lmc: 0 };
    e.total += 1;
    if (s(x.status) === 'cancelled' && b(x.lastMinuteCancel)) e.lmc += 1;
    agg.set(vid, e);
  });
  const flags: FraudFlag[] = [];
  agg.forEach((e, vid) => {
    const ratio = e.total > 0 ? e.lmc / e.total : 0;
    if (e.total >= minSample && ratio > 0.5) {
      flags.push({ vendorId: vid, vendorName: e.name, totalBookings: e.total, lastMinuteCancels: e.lmc, ratio });
    }
  });
  return flags.sort((a, c) => c.ratio - a.ratio);
}

// ══════════════════════════════════════════════════════════════
// VENDORS
// ══════════════════════════════════════════════════════════════
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
  weeklyEarnings: number; // canonical wallet balance (vendors/{id}/wallet/main.balance)
  isGstRegistered: boolean;
  email?: string;
  address?: string;
  gstNumber?: string;
  commissionRate?: number;
}

// Canonical vendor wallet balance lives at vendors/{id}/wallet/main.balance.
// The legacy `pendingPayout` field on the vendor doc is NO LONGER maintained by
// the money engine — always read the ledger so admin matches the vendor app.
async function fetchWalletBalance(vendorId: string): Promise<number> {
  try {
    const w = await getDoc(doc(db, 'vendors', vendorId, 'wallet', 'main'));
    return w.exists() ? n((w.data() as Record<string, unknown>).balance) : 0;
  } catch {
    return 0;
  }
}

function normVendorStatus(x: Record<string, unknown>): AdminVendor['status'] {
  const st = s(x.status).toLowerCase();
  if (st === 'suspended') return 'suspended';
  if (st === 'blocked') return 'blocked';
  if (st === 'pending' || st === 'pending_approval') return 'pending';
  if (st === 'active' || st === 'approved') return 'active';
  return b(x.isActive) ? 'active' : 'pending';
}

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

/** Admin status override. Writes to the vendor doc (rules: isAdmin). */
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

// ── Vendor onboarding approvals ──
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

export const fetchVendorRequests = async (): Promise<AdminVendorRequest[]> => {
  // Prefer the dedicated requests collection; fall back to pending vendors.
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
  } catch {
    // ignore — collection may not exist
  }
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

export const approveVendor = (uid: string) => setVendorStatus(uid, 'active');
export const rejectVendor = (uid: string, reason?: string) =>
  setVendorStatus(uid, 'blocked', reason || 'Rejected during onboarding');

// ── Vendor detail ──
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

const mapBkStatus = (st: string): AdminVendorBooking['status'] => {
  const x = st.toLowerCase();
  if (x === 'completed' || x === 'reviewed') return 'COMPLETED';
  if (x === 'cancelled' || x === 'rejected' || x === 'failed') return 'CANCELLED';
  return 'CONFIRMED';
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

export interface AdminVendorService {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}
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

/** Update editable vendor profile fields (rules: isAdmin/isSignedIn). */
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

/** Flag / unflag a review (rules: reviews update isSignedIn). */
export const setReviewFlag = async (reviewId: string, flagged: boolean): Promise<void> => {
  await updateDoc(doc(db, 'reviews', reviewId), { flagged, flaggedAt: serverTimestamp() });
};

// ══════════════════════════════════════════════════════════════
// CUSTOMERS (users)
// ══════════════════════════════════════════════════════════════
export interface AdminCustomer {
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
}

export const fetchCustomers = async (): Promise<AdminCustomer[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const locked = x.status === 'locked' || b(x.isBlocked);
    return {
      uid: d.id,
      name: s(x.name) || s(x.displayName) || 'Customer',
      phone: s(x.phone) || s(x.phoneNumber),
      email: s(x.email),
      city: s(x.city) || s(x.area),
      pincode: s(x.pincode),
      walletBalance: n(x.walletBalance),
      bookingsCount: n(x.bookingsCount) || n(x.totalBookings),
      status: locked ? 'locked' : 'active',
      referralCode: s(x.referralCode),
      referredBy: s(x.referredBy) || undefined,
      referralCount: n(x.referralCount),
      joinedAt: toMillis(x.createdAt),
    };
  });
};

// Per-customer detail (bookings + wallet transactions) for the support drawer.
export interface AdminCustomerBooking {
  id: string;
  shopName: string;
  services: string[];
  dateTime: string;
  amount: number;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  paymentMethod: 'ONLINE' | 'COD';
}
export interface AdminWalletTxn {
  id: string;
  dateTime: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  actionedBy: string;
}

function mapBookingStatus(st: string): AdminCustomerBooking['status'] {
  const x = st.toLowerCase();
  if (x === 'completed' || x === 'reviewed') return 'COMPLETED';
  if (x === 'cancelled' || x === 'rejected' || x === 'failed') return 'CANCELLED';
  return 'CONFIRMED';
}

export const fetchCustomerDetail = async (
  uid: string,
): Promise<{ bookings: AdminCustomerBooking[]; transactions: AdminWalletTxn[] }> => {
  const bookings: AdminCustomerBooking[] = [];
  const transactions: AdminWalletTxn[] = [];
  try {
    const bq = query(collection(db, 'bookings'), where('userId', '==', uid), limit(50));
    const bs = await getDocs(bq);
    bs.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      const svc = Array.isArray(x.services)
        ? (x.services as Record<string, unknown>[]).map((sv) => s(sv.serviceName) || s(sv.name)).filter(Boolean)
        : [];
      const at = toMillis(x.createdAt ?? x.scheduledDate);
      const pm = s(x.paymentMethod).toLowerCase();
      bookings.push({
        id: d.id,
        shopName: s(x.vendorName) || s(x.shopName) || 'Vendor',
        services: svc,
        dateTime: at ? new Date(at).toLocaleString() : '—',
        amount: n(x.totalAmount) || n(x.servicePrice),
        status: mapBookingStatus(s(x.status)),
        paymentMethod: pm === 'cash' || pm === 'cod' ? 'COD' : 'ONLINE',
      });
    });
    bookings.sort((a, z) => (z.dateTime > a.dateTime ? 1 : -1));
  } catch { /* index/permission — leave empty */ }
  try {
    const tq = query(collection(db, 'wallets', uid, 'transactions'), limit(50));
    const ts = await getDocs(tq);
    ts.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      const amt = n(x.amount);
      const at = toMillis(x.date ?? x.createdAt);
      transactions.push({
        id: d.id,
        dateTime: at ? new Date(at).toLocaleString() : '—',
        amount: amt,
        type: amt >= 0 ? 'CREDIT' : 'DEBIT',
        description: s(x.description) || s(x.type) || 'Transaction',
        actionedBy: s(x.actionedBy) || 'system',
      });
    });
    transactions.sort((a, z) => (z.dateTime > a.dateTime ? 1 : -1));
  } catch { /* leave empty */ }
  return { bookings, transactions };
};

/** Lock / unlock a customer account (writes users/{uid}.status). */
export const setCustomerLock = async (uid: string, locked: boolean, reason?: string): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    status: locked ? 'locked' : 'active',
    isBlocked: locked,
    ...(reason ? { lockReason: reason } : {}),
    statusUpdatedAt: serverTimestamp(),
  });
};

/** Atomic wallet credit/debit via the admin Cloud Function. */
const _adminAdjustWallet = httpsCallable<
  { userId: string; amount: number; reason: string },
  { ok: boolean; balanceAfter: number }
>(functions, 'adminAdjustWallet');
export const adjustCustomerWallet = (userId: string, amount: number, reason: string) =>
  _adminAdjustWallet({ userId, amount, reason });

// ══════════════════════════════════════════════════════════════
// PLATFORM CONFIG  (appConfig/financials — read by the Cloud Functions
// via functions/config.js getFinancialConfig)
// ══════════════════════════════════════════════════════════════
export const fetchAppFinancials = async (): Promise<Record<string, unknown>> => {
  const snap = await getDoc(doc(db, 'appConfig', 'financials'));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : {};
};
export const saveAppFinancials = async (patch: Record<string, unknown>): Promise<void> => {
  await setDoc(doc(db, 'appConfig', 'financials'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
};

// ══════════════════════════════════════════════════════════════
// SETTLEMENTS  (settlements/{vendorId}/history/{settlementId})
// ══════════════════════════════════════════════════════════════
export interface AdminSettlement {
  id: string;
  vendorId: string;
  shopName: string;
  bankAccount: { accountNumber: string; ifscCode: string; holderName: string };
  weekKey: string;
  grossEarnings: number;
  commissionPaid: number;
  codCollected: number;
  walletAdjustments: number;
  netPayoutDue: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  paymentTxnId?: string;
  processedAt?: string;
}

export const fetchSettlements = async (): Promise<AdminSettlement[]> => {
  // Vendor lookup for shop name + bank details.
  const vSnap = await getDocs(collection(db, 'vendors'));
  const vmap = new Map<string, { shopName: string; bank: AdminSettlement['bankAccount'] }>();
  vSnap.docs.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const bank = (x.bankDetails ?? {}) as Record<string, unknown>;
    vmap.set(d.id, {
      shopName: s(x.shopName) || s(x.businessName) || s(x.name) || d.id,
      bank: {
        accountNumber: s(bank.accountNumber) || '—',
        ifscCode: s(bank.ifscCode) || '—',
        holderName: s(bank.holderName) || s(x.ownerName) || '—',
      },
    });
  });

  const out: AdminSettlement[] = [];
  try {
    const cg = await getDocs(collectionGroup(db, 'history'));
    cg.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      if (!x.settlementId && x.grossAmount === undefined) return; // not a settlement doc
      const vendorId = s(x.vendorId);
      const v = vmap.get(vendorId);
      const weekMs = toMillis(x.weekOf ?? x.createdAt);
      const st = s(x.status).toUpperCase();
      const processedMs = toMillis(x.processedAt);
      out.push({
        id: s(x.settlementId) || d.id,
        vendorId,
        shopName: v?.shopName || vendorId || '—',
        bankAccount: v?.bank || { accountNumber: '—', ifscCode: '—', holderName: '—' },
        weekKey: weekMs ? new Date(weekMs).toLocaleDateString() : '—',
        grossEarnings: n(x.grossAmount),
        commissionPaid: n(x.commissionAmount),
        codCollected: 0,
        walletAdjustments: 0,
        netPayoutDue: n(x.payoutAmount) || n(x.netAmount),
        status: st === 'PAID' ? 'PAID' : st === 'PROCESSING' ? 'PROCESSING' : 'PENDING',
        paymentTxnId: s(x.paymentTxnId) || undefined,
        processedAt: processedMs ? new Date(processedMs).toLocaleString() : undefined,
      });
    });
  } catch { /* missing index/permission */ }
  out.sort((a, z) => (z.weekKey > a.weekKey ? 1 : -1));
  return out;
};

const _runWeeklySettlements = httpsCallable<Record<string, never>, { processed: number; weekId: string }>(
  functions,
  'runWeeklySettlements',
);
export const runSettlements = () => _runWeeklySettlements({});

// Zero the canonical vendor wallet ledger (vendors/{id}/wallet/main) once
// finance has actually paid out / written off the balance. Server-side
// (verifyAdmin) — records a settlement + a manual_settlement txn.
const _settleVendorWallet = httpsCallable<
  { vendorId: string; note?: string },
  { ok: boolean; balanceBefore: number; balanceAfter: number; settlementId?: string }
>(functions, 'settleVendorWallet');
export const settleVendorWallet = (vendorId: string, note?: string) =>
  _settleVendorWallet({ vendorId, note });

export const markSettlementPaid = async (
  vendorId: string,
  settlementId: string,
  paymentTxnId: string,
): Promise<void> => {
  await updateDoc(doc(db, 'settlements', vendorId, 'history', settlementId), {
    status: 'PAID',
    paymentTxnId,
    processedAt: serverTimestamp(),
  });
  // Now that the payout is recorded, zero the canonical wallet ledger so the
  // vendor's balance returns to 0 (scenario 6).
  try {
    await _settleVendorWallet({ vendorId, note: `Settlement ${settlementId} marked paid` });
  } catch (e) {
    console.error('[markSettlementPaid] settleVendorWallet failed:', e);
  }
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD STATS (computed from collections)
// ══════════════════════════════════════════════════════════════
export interface DashboardStats {
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  totalCustomers: number;
  totalBookings: number;
  completedBookings: number;
  grossRevenue: number;
  recentBookings: {
    id: string;
    customerName: string;
    vendorName: string;
    amount: number;
    status: string;
    at: number | null;
  }[];
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const [vendorsSnap, usersSnap, bookingsSnap] = await Promise.all([
    getDocs(collection(db, 'vendors')),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(200))),
  ]);

  let activeVendors = 0;
  let pendingVendors = 0;
  vendorsSnap.docs.forEach((d) => {
    const st = normVendorStatus(d.data() as Record<string, unknown>);
    if (st === 'active') activeVendors++;
    if (st === 'pending') pendingVendors++;
  });

  let completed = 0;
  let gross = 0;
  const recent: DashboardStats['recentBookings'] = [];
  bookingsSnap.docs.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const status = s(x.status);
    if (status === 'completed') {
      completed++;
      gross += n(x.servicePrice) || n(x.totalAmount);
    }
    if (recent.length < 8) {
      recent.push({
        id: d.id,
        customerName: s(x.customerName) || s(x.userName) || 'Customer',
        vendorName: s(x.vendorName) || s(x.shopName) || 'Vendor',
        amount: n(x.totalAmount) || n(x.servicePrice),
        status,
        at: toMillis(x.createdAt),
      });
    }
  });

  return {
    totalVendors: vendorsSnap.size,
    activeVendors,
    pendingVendors,
    totalCustomers: usersSnap.size,
    totalBookings: bookingsSnap.size,
    completedBookings: completed,
    grossRevenue: gross,
    recentBookings: recent,
  };
};
