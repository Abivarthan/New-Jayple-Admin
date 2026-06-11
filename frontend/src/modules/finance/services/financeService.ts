import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../../shared/services/firebase';
import { s, n, toMillis } from '../../../shared/utils/firestore.helpers';

const functions = getFunctions(app, 'asia-south1');

// ── Types ─────────────────────────────────────────────────────────────────────

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
  refundStatus: string;
  rejectedAt: number | null;
}

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

// ── Refund Cases ──────────────────────────────────────────────────────────────

export async function fetchRefundCases(): Promise<RefundCase[]> {
  const snap = await getDocs(
    query(
      collection(db, 'bookings'),
      where('refundStatus', 'in', ['pending_admin', 'refunded']),
    ),
  );
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
export const markRefundProcessed = (bookingId: string) =>
  _markRefundProcessed({ bookingId }).then((r) => r.data);

// ── Settlements ───────────────────────────────────────────────────────────────

export const fetchSettlements = async (): Promise<AdminSettlement[]> => {
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
      if (!x.settlementId && x.grossAmount === undefined) return;
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
  functions, 'runWeeklySettlements',
);
export const runSettlements = () => _runWeeklySettlements({});

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
  try {
    await _settleVendorWallet({ vendorId, note: `Settlement ${settlementId} marked paid` });
  } catch (e) {
    console.error('[markSettlementPaid] settleVendorWallet failed:', e);
  }
};

// ── App Financials ────────────────────────────────────────────────────────────

export const fetchAppFinancials = async (): Promise<Record<string, unknown>> => {
  const snap = await getDoc(doc(db, 'appConfig', 'financials'));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : {};
};

export const saveAppFinancials = async (patch: Record<string, unknown>): Promise<void> => {
  await setDoc(doc(db, 'appConfig', 'financials'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
};
