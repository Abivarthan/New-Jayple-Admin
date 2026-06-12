import type { AdminPermission } from '../shared/constants/permissions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NavChild {
  title: string;
  path: string;
  badge?: string;         // e.g. "NEW", "BETA"
  disabled?: boolean;     // placeholder pages — visible but greyed out
}

export interface NavGroup {
  id: string;
  title: string;
  icon: string;           // lucide icon name
  permission?: AdminPermission;   // hides entire group if no access
  children: NavChild[];
}

// ── Navigation Configuration ──────────────────────────────────────────────────
// Single source of truth for the sidebar. All routes are here.

export const navigationConfig: NavGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    children: [
      { title: 'Overview', path: '/dashboard' },
    ],
  },

  {
    id: 'customer-management',
    title: 'Customer Management',
    icon: 'Users',
    permission: 'customers',
    children: [
      { title: 'All Customers', path: '/customers' },
    ],
  },

  {
    id: 'vendor-management',
    title: 'Vendor Management',
    icon: 'Store',
    permission: 'vendors',
    children: [
      { title: 'All Vendors', path: '/vendors' },
    ],
  },

  {
    id: 'booking-management',
    title: 'Booking Management',
    icon: 'Calendar',
    permission: 'bookings',
    children: [
      { title: 'All Bookings',      path: '/bookings' },
      { title: 'Booking Monitor',   path: '/bookings/monitor' },
      { title: 'Auto Accepted',     path: '/bookings/auto-accepted' },
      { title: 'Delayed Services',  path: '/bookings/delayed' },
      { title: 'Call Workflow',     path: '/bookings/calls' },
    ],
  },

  {
    id: 'catalog-management',
    title: 'Catalog Management',
    icon: 'Tag',
    permission: 'catalog',
    children: [
      { title: 'Categories',      path: '/catalog/categories' },
      { title: 'Image Library',   path: '/catalog/image-library' },
    ],
  },

  {
    id: 'content-management',
    title: 'Content Management',
    icon: 'LayoutTemplate',
    permission: 'content',
    children: [
      { title: 'Home Content', path: '/content/home' },
      { title: 'Banners',      path: '/content/hero-banners' },
    ],
  },

  {
    id: 'promotions-marketing',
    title: 'Promotion Management',
    icon: 'Percent',
    permission: 'promotions',
    children: [
      { title: 'Promotions', path: '/promotions' },
      { title: 'Coupons',    path: '/promotions/coupons' },
    ],
  },

  {
    id: 'finance-management',
    title: 'Finance Management',
    icon: 'IndianRupee',
    permission: 'finance',
    children: [
      { title: 'Settlements',  path: '/finance/settlements' },
      { title: 'Refund Cases', path: '/finance/refunds' },
    ],
  },

  {
    id: 'risk-fraud',
    title: 'Fraud Management',
    icon: 'ShieldAlert',
    permission: 'fraud',
    children: [
      { title: 'Fraud Flags', path: '/fraud/flags' },
    ],
  },

  {
    id: 'analytics-reports',
    title: 'Analytics',
    icon: 'BarChart3',
    permission: 'analytics',
    children: [
      { title: 'Dashboard Analytics', path: '/analytics' },
    ],
  },

  {
    id: 'platform-configuration',
    title: 'Platform Settings',
    icon: 'Settings',
    permission: 'settings',
    children: [
      { title: 'Service Radius',  path: '/settings/service-radius' },
      { title: 'UI Config',       path: '/settings/ui-config' },
      { title: 'Platform Config', path: '/settings/platform-config' },
    ],
  },

  {
    id: 'administration',
    title: 'Administration',
    icon: 'Shield',
    permission: 'administration',
    children: [
      { title: 'Admin Users',         path: '/admin/users' },
      { title: 'Roles & Permissions', path: '/admin/roles' },
      { title: 'Audit Logs',          path: '/admin/audit-log' },
    ],
  },
];
