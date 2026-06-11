import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { s, n, b, toMillis } from '../../../shared/utils/firestore.helpers';

// Inline helper to avoid circular deps with vendorService
function normVendorStatus(x: Record<string, unknown>): 'active' | 'pending' | 'suspended' | 'blocked' {
  const st = s(x.status).toLowerCase();
  if (st === 'suspended') return 'suspended';
  if (st === 'blocked') return 'blocked';
  if (st === 'pending' || st === 'pending_approval') return 'pending';
  if (st === 'active' || st === 'approved') return 'active';
  return b(x.isActive) ? 'active' : 'pending';
}

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
