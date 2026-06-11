// Promotions module service
// Handles promo codes, campaigns, and offers

import { db } from '../../../shared/services/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { s, n, b, toMillis } from '../../../shared/utils/firestore.helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  code?: string;
  isActive: boolean;
  startDate: number | null;
  endDate: number | null;
  zones: string[];
  usageCount: number;
  maxUsage: number;
  createdAt: number | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const fetchPromotions = async (): Promise<Promotion[]> => {
  try {
    const snap = await getDocs(collection(db, 'promotions'));
    return snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        title: s(x.title) || s(x.name) || 'Untitled',
        description: s(x.description),
        discountType: (s(x.discountType) as Promotion['discountType']) || 'flat',
        discountValue: n(x.discountValue) || n(x.discount),
        minOrderValue: n(x.minOrderValue),
        maxDiscount: n(x.maxDiscount),
        code: s(x.code) || undefined,
        isActive: x.isActive !== false,
        startDate: toMillis(x.startDate),
        endDate: toMillis(x.endDate),
        zones: Array.isArray(x.zones) ? (x.zones as string[]) : [],
        usageCount: n(x.usageCount),
        maxUsage: n(x.maxUsage),
        createdAt: toMillis(x.createdAt),
      };
    });
  } catch {
    return [];
  }
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const togglePromotion = async (id: string, isActive: boolean): Promise<void> => {
  await updateDoc(doc(db, 'promotions', id), { isActive, updatedAt: serverTimestamp() });
};
