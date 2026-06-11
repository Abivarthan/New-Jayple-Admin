// ── Currency ──────────────────────────────────────────────────────────────────

/** Format a number as Indian Rupees */
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

/** Compact format (e.g. ₹1.2L, ₹45K) */
export const formatINRCompact = (amount: number): string => {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
};

// ── Dates ─────────────────────────────────────────────────────────────────────

/** Format epoch millis to locale date string */
export const formatDate = (ms: number | null | undefined): string => {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Format epoch millis to locale date + time string */
export const formatDateTime = (ms: number | null | undefined): string => {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Relative time (e.g. "2 hours ago") */
export const formatRelativeTime = (ms: number | null | undefined): string => {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ── Phone ─────────────────────────────────────────────────────────────────────

/** Format Indian phone number (e.g. +91 98765 43210) */
export const formatPhone = (phone: string): string => {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  if (clean.length === 12 && clean.startsWith('91'))
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  return phone;
};

// ── Status ────────────────────────────────────────────────────────────────────

/** Capitalize first letter */
export const capitalize = (str: string): string =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '—';

/** Truncate string with ellipsis */
export const truncate = (str: string, maxLen = 50): string =>
  str && str.length > maxLen ? `${str.slice(0, maxLen)}…` : str || '—';
