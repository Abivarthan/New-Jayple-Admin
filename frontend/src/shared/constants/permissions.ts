// ── Module-level permissions ──────────────────────────────────────────────────
// These replace and extend the old 9-string AdminPermission from shared/src/types.ts
// Legacy strings are kept for backward compatibility.

export type AdminPermission =
  // Module-level (new)
  | 'dashboard'
  | 'customers'
  | 'vendors'
  | 'bookings'
  | 'catalog'
  | 'content'
  | 'promotions'
  | 'finance'
  | 'fraud'
  | 'analytics'
  | 'settings'
  | 'administration'
  // Legacy (kept for backward compat with existing Firestore adminUsers docs)
  | 'users'
  | 'zones'
  | 'uiconfig'
  | 'settlements'
  | 'audit'
  | 'admin-users';

// ── Role definitions ──────────────────────────────────────────────────────────

export type AdminRole =
  | 'superadmin'
  | 'operations_manager'
  | 'finance_manager'
  | 'customer_support'
  | 'vendor_manager'
  | 'content_manager'
  // Legacy
  | 'manager'
  | 'support';

// ── Default permissions per role ──────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [
    'dashboard', 'customers', 'vendors', 'bookings', 'catalog',
    'content', 'promotions', 'finance', 'fraud', 'analytics',
    'settings', 'administration',
  ],
  operations_manager: [
    'dashboard', 'customers', 'vendors', 'bookings', 'catalog',
    'content', 'promotions', 'fraud', 'analytics',
  ],
  finance_manager: [
    'dashboard', 'finance', 'analytics',
  ],
  customer_support: [
    'dashboard', 'customers', 'bookings',
  ],
  vendor_manager: [
    'dashboard', 'vendors', 'bookings', 'fraud', 'analytics',
  ],
  content_manager: [
    'dashboard', 'catalog', 'content', 'promotions',
  ],
  // Legacy role mappings
  manager: [
    'dashboard', 'customers', 'vendors', 'bookings', 'catalog',
    'content', 'promotions', 'fraud', 'analytics',
  ],
  support: [
    'dashboard', 'customers', 'bookings',
  ],
};
