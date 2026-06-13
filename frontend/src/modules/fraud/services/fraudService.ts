import { collection, getDocs, doc, setDoc, query, where, orderBy, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { s, n, toMillis } from '../../../shared/utils/firestore.helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FraudFlag {
  vendorId: string;
  vendorName: string;
  totalBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  riskLevel: 'High Risk' | 'Medium Risk' | 'Low Risk' | 'None';
  flaggedAt?: string;
  status: 'Flagged' | 'Under Review' | 'Cleared' | 'Suspended';
}

export interface FraudInvestigation {
  vendorId: string;
  vendorName: string;
  investigationDate?: any;
  investigatedBy: string;
  notes: string;
  actionTaken: string;
  status: string;
}

export interface RecentBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  dateTime: string;
  services: string;
  amount: number;
  cancellationReason: string;
  cancelledBy: string;
  status: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function fetchFraudFlags(): Promise<FraudFlag[]> {
  // Read directly from the newly updated fraudFlags collection
  const snap = await getDocs(query(collection(db, 'fraudFlags'), where('status', 'in', ['Flagged', 'Under Review'])));
  const flags: FraudFlag[] = [];
  
  snap.forEach((d) => {
    const data = d.data();
    flags.push({
      vendorId: s(data.vendorId),
      vendorName: s(data.vendorName),
      totalBookings: n(data.totalBookings),
      cancelledBookings: n(data.cancelledBookings),
      cancellationRate: n(data.cancellationRate),
      riskLevel: s(data.riskLevel) as FraudFlag['riskLevel'],
      flaggedAt: data.flaggedAt ? new Date(toMillis(data.flaggedAt) || Date.now()).toLocaleString() : '—',
      status: s(data.status) as FraudFlag['status'],
    });
  });
  
  return flags.sort((a, b) => b.cancellationRate - a.cancellationRate);
}

export async function fetchVendorCancelledBookings(vendorId: string): Promise<RecentBooking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('vendorId', '==', vendorId),
    where('status', '==', 'cancelled'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    const created = data.createdAt ? new Date(toMillis(data.createdAt) || Date.now()).toLocaleString() : '—';
    return {
      id: doc.id,
      customerName: s(data.customerName) || s(data.userName) || 'Unknown Customer',
      customerPhone: s(data.customerPhone) || s(data.userPhone) || '—',
      dateTime: created,
      services: Array.isArray(data.services) ? data.services.map((x: any) => s(x.name)).join(', ') : 'Various Services',
      amount: n(data.totalAmount) || n(data.amount) || 0,
      cancellationReason: s(data.cancellationReason) || s(data.cancelReason) || 'No reason provided',
      cancelledBy: s(data.cancelledBy) || 'Vendor / Customer', // Fallback if no specific role
      status: s(data.status),
    };
  });
}

export async function saveFraudInvestigation(investigation: FraudInvestigation) {
  const ref = collection(db, 'fraudInvestigations');
  await addDoc(ref, {
    ...investigation,
    investigationDate: serverTimestamp(),
  });
}

export async function updateFraudFlagStatus(vendorId: string, status: string, riskLevel?: string) {
  const ref = doc(db, 'fraudFlags', vendorId);
  const updates: any = { status };
  if (riskLevel) updates.riskLevel = riskLevel;
  
  await updateDoc(ref, updates);
}
