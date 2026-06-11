import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { s, n, b, toMillis } from '../../../shared/utils/firestore.helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FraudFlag {
  vendorId: string;
  vendorName: string;
  totalBookings: number;
  lastMinuteCancels: number;
  ratio: number;
}

// ── Queries ───────────────────────────────────────────────────────────────────

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
