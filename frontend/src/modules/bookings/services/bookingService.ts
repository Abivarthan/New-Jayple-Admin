import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../../shared/services/firebase';
import { s, n, b, toMillis } from '../../../shared/utils/firestore.helpers';

const functions = getFunctions(app, 'asia-south1');

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Internal helpers ──────────────────────────────────────────────────────────

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

function slotMillis(date: string, time: string): number | null {
  if (!date || !time) return null;
  const t = Date.parse(`${date}T${time.length === 5 ? time + ':00' : time}+05:30`);
  return isNaN(t) ? null : t;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const fetchBookingsMonitor = async (max = 200): Promise<AdminBooking[]> => {
  const snap = await getDocs(query(
    collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(max),
  ));
  return snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
};

export const fetchAutoAcceptedReview = async (): Promise<AdminBooking[]> => {
  const snap = await getDocs(query(
    collection(db, 'bookings'), where('autoAccepted', '==', true),
  ));
  const rows = snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, c) => {
    if (a.adminReviewed !== c.adminReviewed) return a.adminReviewed ? 1 : -1;
    return (c.createdAt || 0) - (a.createdAt || 0);
  });
  return rows;
};

export const fetchDelayedServices = async (graceMin = 15): Promise<AdminBooking[]> => {
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
};

export const fetchCallWorkflow = async (): Promise<AdminBooking[]> => {
  const snap = await getDocs(query(collection(db, 'bookings'), where('status', '==', 'confirmed')));
  const rows = snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, c) => {
    const ap = (a.oneHourAlert ? 0 : 1) + (a.callStatus === 'pending' ? 0 : 2);
    const cp = (c.oneHourAlert ? 0 : 1) + (c.callStatus === 'pending' ? 0 : 2);
    if (ap !== cp) return ap - cp;
    return (c.createdAt || 0) - (a.createdAt || 0);
  });
  return rows;
};

// ── Mutations ─────────────────────────────────────────────────────────────────

const _adminCancelBooking = httpsCallable<{ bookingId: string; reason?: string }, { ok?: boolean; refundAmount?: number }>(
  functions, 'adminCancelBooking');
export const adminCancelBooking = (bookingId: string, reason?: string) =>
  _adminCancelBooking({ bookingId, reason });

const _rescheduleBookingFn = httpsCallable<{ bookingId: string; newSlotDate: string; newSlotTime: string }, { bookingId?: string }>(
  functions, 'rescheduleBooking');
export const adminRescheduleBooking = (bookingId: string, newSlotDate: string, newSlotTime: string) =>
  _rescheduleBookingFn({ bookingId, newSlotDate, newSlotTime });

const _setBookingCallStatus = httpsCallable<{ bookingId: string; callStatus: string; callStage?: string; note?: string }, { ok: boolean }>(
  functions, 'setBookingCallStatus');
export const setBookingCallStatus = (bookingId: string, callStatus: string, callStage?: string, note?: string) =>
  _setBookingCallStatus({ bookingId, callStatus, callStage, note });

const _confirmAutoAccepted = httpsCallable<{ bookingId: string }, { ok: boolean }>(
  functions, 'confirmAutoAcceptedBooking',
);
export const confirmAutoAccepted = (bookingId: string): Promise<{ ok: boolean }> =>
  _confirmAutoAccepted({ bookingId }).then((r) => r.data);

export const markBookingAdminReviewed = async (bookingId: string): Promise<void> => {
  await updateDoc(doc(db, 'bookings', bookingId), { adminReviewed: true });
};
