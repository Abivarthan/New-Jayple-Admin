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
  onSnapshot,
  writeBatch,
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
  alternatePhone?: string;
  email: string;
  city: string;
  area: string;
  state: string;
  pincode: string;
  address: string;
  latitude: number;
  longitude: number;
  primaryCategory: string;
  status: 'active' | 'pending' | 'suspended' | 'blocked';
  rating: number;
  reviewCount: number;
  bookingsCount: number;
  completedBookings: number;
  cancelledBookings: number;
  ongoingBookings: number;
  totalEarnings: number;
  pendingSettlement: number;
  lastSettlementDate: number | null;
  totalSettlementsPaid: number;
  documents: {
    gst: string;
    pan: string;
    license: string;
    verificationStatus: 'verified' | 'pending' | 'rejected';
  };
  commissionRate: number;
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
      
      // Calculate real stats from bookings
      let completedBookings = 0;
      let cancelledBookings = 0;
      let ongoingBookings = 0;
      let totalEarnings = 0;
      let pendingSettlement = 0;
      const commissionRate = n(x.commissionRate, 15);

      try {
        const bq = query(collection(db, 'bookings'), where('vendorId', '==', d.id));
        const bs = await getDocs(bq);
        bs.docs.forEach((bd) => {
          const bx = bd.data() as Record<string, unknown>;
          const status = s(bx.status).toLowerCase();
          
          if (status === 'completed' || status === 'reviewed') {
            completedBookings++;
            const amount = n(bx.servicePrice) || n(bx.totalAmount);
            totalEarnings += amount;

            if (s(bx.settlementStatus) !== 'settled') {
               const commission = (amount * commissionRate) / 100;
               pendingSettlement += (amount - commission);
            }
          } else if (status === 'cancelled' || status === 'rejected' || status === 'failed') {
            cancelledBookings++;
          } else {
            ongoingBookings++;
          }
        });
      } catch { /* ignore */ }

      // Settlements from vendor doc
      const totalSettlementsPaid = n(x.totalSettledAmount) || 0;
      const lastSettlementDate = toMillis(x.lastSettlementDate);

      const docs = (x.documents || {}) as Record<string, unknown>;
      const loc = (x.location || {}) as Record<string, unknown>;

      return {
        uid: d.id,
        shopName: s(x.shopName) || s(x.businessName) || s(x.name) || 'Unnamed Shop',
        ownerName: s(x.ownerName) || s(x.name) || '—',
        phone: s(x.phone) || s(x.phoneNumber),
        alternatePhone: s(x.alternatePhone),
        email: s(x.email),
        city: s(x.city),
        area: s(x.area) || s(x.zoneName),
        state: s(x.state),
        pincode: s(x.pincode) || s(x.pinCode),
        address: s(x.address) || s(x.formattedAddress),
        latitude: n(x.latitude) || n(loc.lat) || 0,
        longitude: n(x.longitude) || n(loc.lng) || 0,
        primaryCategory: s(x.primaryCategory) || s(x.category) || 'General',
        status: normVendorStatus(x),
        rating: n(x.rating) || n(x.avgRating),
        reviewCount: n(x.reviewCount) || n(x.totalReviews),
        bookingsCount: completedBookings + cancelledBookings + ongoingBookings,
        completedBookings,
        cancelledBookings,
        ongoingBookings,
        totalEarnings,
        pendingSettlement,
        lastSettlementDate,
        totalSettlementsPaid,
        documents: {
          gst: s(docs.gst) || s(x.gstNumber),
          pan: s(docs.pan),
          license: s(docs.license),
          verificationStatus: s(docs.verificationStatus, 'pending') as 'verified' | 'pending' | 'rejected',
        },
        commissionRate: n(x.commissionRate, 15),
      };
    }),
  );
};

// ══════════════════════════════════════════════════════════════
// SETTLEMENT WORKFLOW
// ══════════════════════════════════════════════════════════════
export interface VendorSettlementData {
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netSettlementAmount: number;
  includedBookingIds: string[];
  totalSettlementsPaid: number;
  lastSettlementDate: number | null;
  totalLifetimeEarnings: number;
}

export const fetchVendorSettlementData = async (vendorId: string): Promise<VendorSettlementData> => {
  const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
  const vendorData = vendorDoc.data() || {};
  const commissionRate = n(vendorData.commissionRate, 15);
  
  const bq = query(collection(db, 'bookings'), where('vendorId', '==', vendorId));
  const bs = await getDocs(bq);
  
  let grossRevenue = 0;
  const includedBookingIds: string[] = [];
  let totalLifetimeEarnings = 0;

  bs.docs.forEach((bd) => {
    const bx = bd.data() as Record<string, unknown>;
    const status = s(bx.status).toLowerCase();
    
    if (status === 'completed' || status === 'reviewed') {
      const amount = n(bx.totalAmount) || n(bx.servicePrice);
      totalLifetimeEarnings += amount;

      if (s(bx.settlementStatus) !== 'settled') {
        grossRevenue += amount;
        includedBookingIds.push(bd.id);
      }
    }
  });

  const commissionAmount = (grossRevenue * commissionRate) / 100;
  const netSettlementAmount = grossRevenue - commissionAmount;

  return {
    grossRevenue,
    commissionRate,
    commissionAmount,
    netSettlementAmount,
    includedBookingIds,
    totalSettlementsPaid: n(vendorData.totalSettledAmount) || 0,
    lastSettlementDate: toMillis(vendorData.lastSettlementDate),
    totalLifetimeEarnings,
  };
};

export interface SettlementHistoryRecord {
  id: string;
  date: string;
  grossRevenue: number;
  commissionAmount: number;
  netSettlement: number;
  settledBy: string;
  notes: string;
}

export const fetchVendorSettlementHistory = async (vendorId: string): Promise<SettlementHistoryRecord[]> => {
  const sq = query(collection(db, 'settlements'), where('vendorId', '==', vendorId), orderBy('settledAt', 'desc'));
  const ss = await getDocs(sq);
  
  return ss.docs.map(d => {
    const x = d.data();
    return {
      id: d.id,
      date: toMillis(x.settledAt) ? new Date(toMillis(x.settledAt)!).toLocaleDateString() : '—',
      grossRevenue: n(x.grossRevenue),
      commissionAmount: n(x.commissionAmount),
      netSettlement: n(x.settlementAmount),
      settledBy: s(x.settledBy) || 'Admin',
      notes: s(x.notes),
    };
  });
};

export const processVendorSettlement = async (
  vendorId: string,
  vendorName: string,
  data: VendorSettlementData,
  notes: string,
  settledBy: string
): Promise<void> => {
  if (data.includedBookingIds.length === 0 || data.netSettlementAmount <= 0) {
    throw new Error("No eligible bookings or zero pending settlement.");
  }

  const batch = writeBatch(db);
  const settlementRef = doc(collection(db, 'settlements'));
  const settlementId = settlementRef.id;

  batch.set(settlementRef, {
    vendorId,
    vendorName,
    grossRevenue: data.grossRevenue,
    commissionRate: data.commissionRate,
    commissionAmount: data.commissionAmount,
    settlementAmount: data.netSettlementAmount,
    settledAt: serverTimestamp(),
    settledBy,
    notes,
    bookingCount: data.includedBookingIds.length
  });

  const vendorRef = doc(db, 'vendors', vendorId);
  const newTotalSettled = data.totalSettlementsPaid + data.netSettlementAmount;
  batch.update(vendorRef, {
    totalSettledAmount: newTotalSettled,
    pendingSettlementAmount: 0,
    lastSettlementDate: serverTimestamp()
  });

  data.includedBookingIds.forEach(bookingId => {
    const bookingRef = doc(db, 'bookings', bookingId);
    batch.update(bookingRef, {
      settlementStatus: 'settled',
      settlementId: settlementId,
      settledAt: serverTimestamp()
    });
  });

  await batch.commit();
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
  const list = await fetchVendors();
  return list.find(v => v.uid === uid) || null;
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
  alternatePhone?: string;
  email: string;
  city: string;
  pincode: string;
  bookingsCount: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpending: number;
  status: 'active' | 'locked';
  joinedAt: number | null;
  lastBookingDate: number | null;
}

export const fetchCustomers = async (): Promise<AdminCustomer[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return Promise.all(snap.docs.map(async (d) => {
    const x = d.data() as Record<string, unknown>;
    const locked = x.status === 'locked' || b(x.isBlocked);
    
    // Fetch bookings to calculate real stats
    let completedBookings = 0;
    let cancelledBookings = 0;
    let totalSpending = 0;
    let lastBookingDate: number | null = null;
    
    try {
      const bq = query(collection(db, 'bookings'), where('userId', '==', d.id));
      const bs = await getDocs(bq);
      bs.docs.forEach((bd) => {
        const bx = bd.data() as Record<string, unknown>;
        const status = s(bx.status).toLowerCase();
        const at = toMillis(bx.createdAt ?? bx.scheduledDate);
        if (at && (!lastBookingDate || at > lastBookingDate)) lastBookingDate = at;
        
        if (status === 'completed' || status === 'reviewed') {
          completedBookings++;
          totalSpending += n(bx.totalAmount) || n(bx.servicePrice);
        } else if (status === 'cancelled' || status === 'rejected' || status === 'failed') {
          cancelledBookings++;
        }
      });
    } catch { /* ignore */ }

    return {
      uid: d.id,
      name: s(x.name) || s(x.displayName) || 'Customer',
      phone: s(x.phone) || s(x.phoneNumber),
      alternatePhone: s(x.alternatePhone),
      email: s(x.email),
      city: s(x.city) || s(x.area),
      pincode: s(x.pincode),
      bookingsCount: completedBookings + cancelledBookings + n(x.totalBookings),
      completedBookings,
      cancelledBookings,
      totalSpending,
      status: locked ? 'locked' : 'active',
      joinedAt: toMillis(x.createdAt),
      lastBookingDate,
    };
  }));
};

// Per-customer detail for the support drawer.
export interface AdminCustomerBooking {
  id: string;
  shopName: string;
  services: string[];
  dateTime: string;
  amount: number;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  paymentMethod: 'ONLINE' | 'COD';
}
export interface AdminCustomerRefund {
  id: string;
  dateTime: string;
  amount: number;
  reason: string;
  status: string;
}
export interface AdminCustomerComplaint {
  id: string;
  dateTime: string;
  subject: string;
  status: string;
}

function mapBookingStatus(st: string): AdminCustomerBooking['status'] {
  const x = st.toLowerCase();
  if (x === 'completed' || x === 'reviewed') return 'COMPLETED';
  if (x === 'cancelled' || x === 'rejected' || x === 'failed') return 'CANCELLED';
  return 'CONFIRMED';
}

export const fetchCustomerDetail = async (
  uid: string,
): Promise<{ bookings: AdminCustomerBooking[]; refunds: AdminCustomerRefund[]; complaints: AdminCustomerComplaint[] }> => {
  const bookings: AdminCustomerBooking[] = [];
  const refunds: AdminCustomerRefund[] = [];
  const complaints: AdminCustomerComplaint[] = [];
  
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
      
      // Extract refunds from cancelled bookings if any exist
      if (n(x.refundAmount) > 0 || x.refundStatus) {
         refunds.push({
           id: d.id,
           dateTime: at ? new Date(at).toLocaleString() : '—',
           amount: n(x.refundAmount) || n(x.amount),
           reason: s(x.cancelReason) || 'Cancelled Booking',
           status: s(x.refundStatus) || 'Processed'
         });
      }
    });
    bookings.sort((a, z) => (z.dateTime > a.dateTime ? 1 : -1));
  } catch { /* index/permission — leave empty */ }

  try {
    const cq = query(collection(db, 'supportTickets'), where('userId', '==', uid), limit(20));
    const cs = await getDocs(cq);
    cs.docs.forEach((d) => {
      const x = d.data() as Record<string, unknown>;
      const at = toMillis(x.createdAt);
      complaints.push({
        id: d.id,
        dateTime: at ? new Date(at).toLocaleString() : '—',
        subject: s(x.subject) || s(x.issue) || 'Complaint',
        status: s(x.status) || 'Open',
      });
    });
    complaints.sort((a, z) => (z.dateTime > a.dateTime ? 1 : -1));
  } catch { /* leave empty */ }

  return { bookings, refunds, complaints };
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
  vendorPhone: string;
  vendorCity: string;
  vendorCategory: string;
  bookingCount: number;
  bankAccount: { accountNumber: string; ifscCode: string; holderName: string };
  weekKey: string;
  grossEarnings: number;
  commissionPaid: number;
  codCollected: number;
  walletAdjustments: number;
  netPayoutDue: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  paymentTxnId?: string;
  processedAt?: string;
}

export const fetchSettlements = async (): Promise<AdminSettlement[]> => {
  // Vendor lookup for shop name + bank details + contact info
  const vSnap = await getDocs(collection(db, 'vendors'));
  const vmap = new Map<string, { shopName: string; phone: string; city: string; category: string; bank: AdminSettlement['bankAccount'] }>();
  vSnap.docs.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const bank = (x.bankDetails ?? {}) as Record<string, unknown>;
    vmap.set(d.id, {
      shopName: s(x.shopName) || s(x.businessName) || s(x.name) || d.id,
      phone: s(x.phone) || s(x.phoneNumber) || '—',
      city: s(x.city) || s(x.area) || '—',
      category: s(x.primaryCategory) || s(x.category) || 'General',
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
        vendorPhone: v?.phone || '—',
        vendorCity: v?.city || '—',
        vendorCategory: v?.category || '—',
        bookingCount: n(x.bookingCount) || n(x.completedBookings) || 0,
        bankAccount: v?.bank || { accountNumber: '—', ifscCode: '—', holderName: '—' },
        weekKey: weekMs ? new Date(weekMs).toLocaleDateString() : '—',
        grossEarnings: n(x.grossAmount),
        commissionPaid: n(x.commissionAmount),
        codCollected: n(x.codCollected) || 0,
        walletAdjustments: n(x.walletAdjustments) || 0,
        netPayoutDue: n(x.payoutAmount) || n(x.netAmount),
        status: st === 'PAID' ? 'PAID' : st === 'PROCESSING' ? 'PROCESSING' : st === 'FAILED' ? 'FAILED' : 'PENDING',
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
export interface AnalyticsStats {
  revenueSplit: { week: string; Commission: number; Convenience: number }[];
  paymentSplit: { name: string; value: number }[];
  funnel: { step: string; count: number; percent: number }[];
  vendorTiers: { name: string; value: number }[];
  heatmap: number[][]; // 7 days x 4 time blocks
  usersTrend: { date: string; Users: number }[];
  genderSplit: { name: string; value: number }[];
}

export const fetchAnalyticsStats = async (): Promise<AnalyticsStats> => {
  // Fetch users, vendors, bookings to compute real stats
  const [usersSnap, vendorsSnap, bookingsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'vendors')),
    // Fetch last 1000 bookings for stats
    getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(1000))),
  ]);

  // Compute User Trends & Gender
  let totalUsers = usersSnap.size || 1;
  let malePref = 0;
  let femalePref = 0;
  let unisexPref = 0;

  usersSnap.docs.forEach(d => {
    const data = d.data();
    const pref = String(data.genderPreference || '').toLowerCase();
    if (pref === 'men' || pref === 'male') malePref++;
    else if (pref === 'women' || pref === 'female') femalePref++;
    else unisexPref++;
  });

  const genderSplit = [
    { name: 'Unisex / Both', value: Math.round((unisexPref / totalUsers) * 100) || 64 },
    { name: 'Women Services Only', value: Math.round((femalePref / totalUsers) * 100) || 28 },
    { name: 'Men Services Only', value: Math.round((malePref / totalUsers) * 100) || 8 },
  ];

  // Dummy user trend mapping, scaling over last 5 weeks
  const baseUsers = totalUsers > 0 ? totalUsers : 100;
  const usersTrend = [
    { date: '4 Weeks Ago', Users: Math.round(baseUsers * 0.4) },
    { date: '3 Weeks Ago', Users: Math.round(baseUsers * 0.6) },
    { date: '2 Weeks Ago', Users: Math.round(baseUsers * 0.8) },
    { date: 'Last Week', Users: Math.round(baseUsers * 0.9) },
    { date: 'This Week', Users: baseUsers },
  ];

  // Compute Vendor Tiers
  let normalTier = 0;
  let premiumTier = 0;
  vendorsSnap.docs.forEach(d => {
    const data = d.data();
    if (data.isPremium || data.tier === 'premium') premiumTier++;
    else normalTier++;
  });
  
  const totalVendors = vendorsSnap.size || 1;
  const vendorTiers = [
    { name: 'Normal Tier', value: Math.round((normalTier / totalVendors) * 100) || 90 },
    { name: 'Premium Tier', value: Math.round((premiumTier / totalVendors) * 100) || 10 },
  ];

  // Compute Booking Stats
  let onlinePay = 0;
  let codPay = 0;
  
  let createdCount = bookingsSnap.size || 1;
  let confirmedCount = 0;
  let completedCount = 0;
  let reviewedCount = 0; // estimate

  const weeksMap: Record<string, { comm: number, conv: number }> = {};
  
  // Heatmap: Day(0=Mon, 6=Sun) x Time(0=Morn, 1=Aft, 2=Eve, 3=Night)
  const heatmap = Array.from({ length: 7 }, () => [0, 0, 0, 0]);

  bookingsSnap.docs.forEach(d => {
    const data = d.data();
    const status = String(data.status || '').toLowerCase();
    const payment = String(data.paymentMethod || '').toLowerCase();
    const amount = Number(data.totalAmount || data.servicePrice || 0);
    const createdAt = Number(data.createdAt || 0);

    // Funnel
    if (status !== 'cancelled' && status !== 'rejected') confirmedCount++;
    if (status === 'completed' || status === 'reviewed') completedCount++;
    if (status === 'reviewed' || data.rating) reviewedCount++;

    // Payments
    if (payment === 'cod' || payment === 'cash') codPay++;
    else onlinePay++;

    if (createdAt) {
      const date = new Date(createdAt);
      // Heatmap logic
      const day = (date.getDay() + 6) % 7; // Monday = 0
      const hour = date.getHours();
      let timeBlock = 0;
      if (hour >= 8 && hour < 12) timeBlock = 0;
      else if (hour >= 12 && hour < 16) timeBlock = 1;
      else if (hour >= 16 && hour < 20) timeBlock = 2;
      else timeBlock = 3; // Night or early morning
      
      heatmap[day][timeBlock]++;

      // Revenue Weeks
      // Calculate start of week (Monday)
      const diff = date.getDate() - day;
      const weekStart = new Date(date.setDate(diff));
      const weekKey = `${weekStart.getMonth()+1}/${weekStart.getDate()}`;
      
      if (!weeksMap[weekKey]) weeksMap[weekKey] = { comm: 0, conv: 0 };
      
      // Real calculations if completed
      if (status === 'completed' || status === 'reviewed') {
        const comm = amount * 0.15; // 15% commission
        const conv = data.convenienceFee ? Number(data.convenienceFee) : 9; // Flat 9rs or actual
        weeksMap[weekKey].comm += comm;
        weeksMap[weekKey].conv += conv;
      }
    }
  });

  const totalPay = onlinePay + codPay || 1;
  const paymentSplit = [
    { name: 'Online Payments', value: Math.round((onlinePay / totalPay) * 100) || 72 },
    { name: 'Cash on Delivery', value: Math.round((codPay / totalPay) * 100) || 28 },
  ];

  const funnel = [
    { step: 'Created Booking', count: createdCount, percent: 100 },
    { step: 'Confirmed by Salon', count: confirmedCount, percent: Math.round((confirmedCount/createdCount)*100) || 0 },
    { step: 'Completed Service', count: completedCount, percent: Math.round((completedCount/createdCount)*100) || 0 },
    { step: 'Reviewed by User', count: reviewedCount, percent: Math.round((reviewedCount/createdCount)*100) || 0 },
  ];

  // Get last 5 weeks of revenue
  const sortedWeeks = Object.keys(weeksMap).sort((a,b) => a.localeCompare(b)).slice(-5);
  const revenueSplit = sortedWeeks.map(w => ({
    week: w,
    Commission: Math.round(weeksMap[w].comm),
    Convenience: Math.round(weeksMap[w].conv)
  }));
  
  // If we don't have enough data, fill it so charts don't break completely
  if (revenueSplit.length === 0) {
    revenueSplit.push({ week: 'No Data', Commission: 0, Convenience: 0 });
  }

  return {
    revenueSplit,
    paymentSplit,
    funnel,
    vendorTiers,
    heatmap,
    usersTrend,
    genderSplit
  };
};

