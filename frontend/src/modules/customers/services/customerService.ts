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

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapBookingStatus(st: string): AdminCustomerBooking['status'] {
  const x = st.toLowerCase();
  if (x === 'completed' || x === 'reviewed') return 'COMPLETED';
  if (x === 'cancelled' || x === 'rejected' || x === 'failed') return 'CANCELLED';
  return 'CONFIRMED';
}

// ── Queries ───────────────────────────────────────────────────────────────────

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
  } catch { /* index/permission */ }
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

// ── Mutations ─────────────────────────────────────────────────────────────────

export const setCustomerLock = async (uid: string, locked: boolean, reason?: string): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    status: locked ? 'locked' : 'active',
    isBlocked: locked,
    ...(reason ? { lockReason: reason } : {}),
    statusUpdatedAt: serverTimestamp(),
  });
};

const _adminAdjustWallet = httpsCallable<
  { userId: string; amount: number; reason: string },
  { ok: boolean; balanceAfter: number }
>(functions, 'adminAdjustWallet');

export const adjustCustomerWallet = (userId: string, amount: number, reason: string) =>
  _adminAdjustWallet({ userId, amount, reason });
