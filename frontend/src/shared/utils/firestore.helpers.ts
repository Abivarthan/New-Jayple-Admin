import { Timestamp } from 'firebase/firestore';

/** Safely cast to string */
export const s = (v: unknown, d = ''): string =>
  typeof v === 'string' && v ? v : d;

/** Safely cast to finite number */
export const n = (v: unknown, d = 0): number =>
  typeof v === 'number' && isFinite(v) ? v : d;

/** Safely cast to boolean */
export const b = (v: unknown): boolean => v === true;

/** Convert Firestore Timestamp | number | string → epoch millis (or null) */
export function toMillis(v: unknown): number | null {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }
  return null;
}
