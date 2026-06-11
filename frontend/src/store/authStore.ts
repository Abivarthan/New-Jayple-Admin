import { create } from 'zustand';
import type { AdminPermission } from '../shared/constants/permissions';
import type { AdminUser } from '../../../../shared/src/types';

// ── Auth Store ────────────────────────────────────────────────────────────────
// Mirrors AuthContext state in Zustand so services/utilities outside React
// component tree can access the current user and permission check.
// The primary auth source of truth remains AuthContext — this store is kept
// in sync by AuthContext via setAdminProfile().

interface AuthStore {
  adminProfile: AdminUser | null;
  setAdminProfile: (profile: AdminUser | null) => void;

  // Granular permission check (works same as AuthContext.hasPermission)
  hasPermission: (permission: AdminPermission) => boolean;

  // Module-level access check (maps module id → permission key)
  hasModuleAccess: (moduleId: string) => boolean;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  adminProfile: null,

  setAdminProfile: (profile) => set({ adminProfile: profile }),

  hasPermission: (permission: AdminPermission): boolean => {
    const { adminProfile } = get();
    if (!adminProfile) return false;
    if (adminProfile.role === 'superadmin') return true;
    return (adminProfile.permissions as string[]).includes(permission);
  },

  hasModuleAccess: (moduleId: string): boolean => {
    const { hasPermission } = get();
    // Map module id to its permission key
    const modulePermissionMap: Record<string, AdminPermission> = {
      dashboard:               'dashboard',
      'customer-management':   'customers',
      'vendor-management':     'vendors',
      'booking-management':    'bookings',
      'catalog-management':    'catalog',
      'content-management':    'content',
      'promotions-marketing':  'promotions',
      'finance-management':    'finance',
      'risk-fraud':            'fraud',
      'analytics-reports':     'analytics',
      'platform-configuration':'settings',
      administration:          'administration',
    };
    const perm = modulePermissionMap[moduleId];
    if (!perm) return true; // no permission required = always visible
    return hasPermission(perm);
  },
}));
