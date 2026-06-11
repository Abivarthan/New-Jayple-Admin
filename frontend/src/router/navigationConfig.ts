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
      { title: 'All Customers',     path: '/customers' },
      { title: 'Customer Details',  path: '/customers/:id',  disabled: true },
      { title: 'Customer History',  path: '/customers/history', disabled: true },
      { title: 'Customer Support',  path: '/customers/support', disabled: true },
    ],
  },

  {
    id: 'vendor-management',
    title: 'Vendor Management',
    icon: 'Store',
    permission: 'vendors',
    children: [
      { title: 'All Vendors',      path: '/vendors' },
      { title: 'Vendor Approvals', path: '/vendors/approvals' },
      { title: 'Vendor Performance', path: '/vendors/performance' },
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
      { title: 'Service Categories', path: '/catalog/categories' },
      { title: 'Sub Categories',     path: '/catalog/sub-categories' },
      { title: 'Image Library',      path: '/catalog/image-library' },
    ],
  },

  {
    id: 'content-management',
    title: 'Content Management',
    icon: 'LayoutTemplate',
    permission: 'content',
    children: [
      { title: 'Home Content',       path: '/content/home' },
      { title: 'Hero Banners',       path: '/content/hero-banners' },
      { title: 'Announcements',      path: '/content/announcements' },
      { title: 'FAQs',               path: '/content/faqs' },
      { title: 'Static Pages',       path: '/content/static-pages' },
      { title: 'Explore & Discovery',path: '/content/explore-discovery' },
      { title: 'Landing Pages',      path: '/content/landing-pages' },
      { title: 'CMS Settings',       path: '/content/settings' },
    ],
  },

  {
    id: 'promotions-marketing',
    title: 'Promotions & Marketing',
    icon: 'Percent',
    permission: 'promotions',
    children: [
      { title: 'Promotions', path: '/promotions' },
      { title: 'Coupons',    path: '/promotions/coupons' },
      { title: 'Campaigns',  path: '/promotions/campaigns' },
    ],
  },

  {
    id: 'finance-management',
    title: 'Finance Management',
    icon: 'IndianRupee',
    permission: 'finance',
    children: [
      { title: 'Settlements',     path: '/finance/settlements' },
      { title: 'Refund Cases',    path: '/finance/refunds' },
      { title: 'Transactions',    path: '/finance/transactions' },
      { title: 'Revenue Reports', path: '/finance/revenue' },
    ],
  },

  {
    id: 'risk-fraud',
    title: 'Risk & Fraud',
    icon: 'ShieldAlert',
    permission: 'fraud',
    children: [
      { title: 'Fraud Flags',         path: '/fraud/flags' },
      { title: 'Fraud Monitoring',    path: '/fraud/monitoring' },
      { title: 'Suspicious Activity', path: '/fraud/suspicious' },
    ],
  },

  {
    id: 'analytics-reports',
    title: 'Analytics & Reports',
    icon: 'BarChart3',
    permission: 'analytics',
    children: [
      { title: 'Analytics Dashboard', path: '/analytics' },
      { title: 'Booking Reports',     path: '/analytics/bookings' },
      { title: 'Vendor Reports',      path: '/analytics/vendors' },
      { title: 'Customer Reports',    path: '/analytics/customers' },
    ],
  },

  {
    id: 'platform-configuration',
    title: 'Platform Configuration',
    icon: 'Settings',
    permission: 'settings',
    children: [
      { title: 'Service Radius',   path: '/settings/service-radius' },
      { title: 'UI Config',        path: '/settings/ui-config' },
      { title: 'Platform Config',  path: '/settings/platform-config' },
      { title: 'Feature Flags',    path: '/settings/feature-flags' },
    ],
  },

  {
    id: 'administration',
    title: 'Administration',
    icon: 'Shield',
    permission: 'administration',
    children: [
      { title: 'Admin Users',       path: '/admin/users' },
      { title: 'Roles & Permissions',path: '/admin/roles' },
      { title: 'Audit Log',         path: '/admin/audit-log' },
      { title: 'Activity Logs',     path: '/admin/activity-logs' },
    ],
  },
];
