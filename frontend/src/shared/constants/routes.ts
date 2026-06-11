// ── Route path constants ──────────────────────────────────────────────────────
// Single source of truth for all route paths in the application.

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',

  // Dashboard
  DASHBOARD: '/dashboard',

  // Customers
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: (id: string) => `/customers/${id}`,

  // Vendors
  VENDORS: '/vendors',
  VENDOR_DETAIL: (id: string) => `/vendors/${id}`,
  VENDOR_APPROVALS: '/vendors/approvals',
  VENDOR_PERFORMANCE: '/vendors/performance',

  // Bookings
  BOOKINGS: '/bookings',
  BOOKING_MONITOR: '/bookings/monitor',
  AUTO_ACCEPTED: '/bookings/auto-accepted',
  DELAYED_SERVICES: '/bookings/delayed',
  CALL_WORKFLOW: '/bookings/calls',

  // Catalog
  CATEGORIES: '/catalog/categories',
  SUB_CATEGORIES: '/catalog/sub-categories',
  IMAGE_LIBRARY: '/catalog/image-library',

  // Content
  HOME_CONTENT: '/content/home',
  HERO_BANNERS: '/content/hero-banners',
  STATIC_PAGES: '/content/static-pages',
  FAQS: '/content/faqs',
  ANNOUNCEMENTS: '/content/announcements',
  EXPLORE_DISCOVERY: '/content/explore-discovery',
  LANDING_PAGES: '/content/landing-pages',
  CMS_SETTINGS: '/content/settings',

  // Promotions
  PROMOTIONS: '/promotions',
  COUPONS: '/promotions/coupons',
  CAMPAIGNS: '/promotions/campaigns',

  // Finance
  SETTLEMENTS: '/finance/settlements',
  REFUND_CASES: '/finance/refunds',
  TRANSACTIONS: '/finance/transactions',
  REVENUE_REPORTS: '/finance/revenue',

  // Fraud & Risk
  FRAUD_FLAGS: '/fraud/flags',
  FRAUD_MONITORING: '/fraud/monitoring',
  SUSPICIOUS_ACTIVITY: '/fraud/suspicious',

  // Analytics
  ANALYTICS: '/analytics',
  BOOKING_REPORTS: '/analytics/bookings',
  VENDOR_REPORTS: '/analytics/vendors',
  CUSTOMER_REPORTS: '/analytics/customers',

  // Settings
  SERVICE_RADIUS: '/settings/service-radius',
  UI_CONFIG: '/settings/ui-config',
  PLATFORM_CONFIG: '/settings/platform-config',
  FEATURE_FLAGS: '/settings/feature-flags',

  // Administration
  ADMIN_USERS: '/admin/users',
  ROLES_PERMISSIONS: '/admin/roles',
  AUDIT_LOG: '/admin/audit-log',
  ACTIVITY_LOGS: '/admin/activity-logs',
} as const;

// Legacy path redirects (old URLs → new URLs)
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/service-radius': ROUTES.SERVICE_RADIUS,
  '/ui-config': ROUTES.UI_CONFIG,
  '/image-library': ROUTES.IMAGE_LIBRARY,
  '/categories': ROUTES.CATEGORIES,
  '/home-content': ROUTES.HOME_CONTENT,
  '/vendors': ROUTES.VENDORS,
  '/users': ROUTES.CUSTOMERS,
  '/bookings': ROUTES.BOOKINGS,
  '/settlements': ROUTES.SETTLEMENTS,
  '/refund-cases': ROUTES.REFUND_CASES,
  '/booking-monitor': ROUTES.BOOKING_MONITOR,
  '/auto-accepted': ROUTES.AUTO_ACCEPTED,
  '/delayed-services': ROUTES.DELAYED_SERVICES,
  '/fraud-flags': ROUTES.FRAUD_FLAGS,
  '/call-workflow': ROUTES.CALL_WORKFLOW,
  '/promotions': ROUTES.PROMOTIONS,
  '/platform-config': ROUTES.PLATFORM_CONFIG,
  '/analytics': ROUTES.ANALYTICS,
  '/admin-users': ROUTES.ADMIN_USERS,
  '/audit-log': ROUTES.AUDIT_LOG,
  '/content/hero-banners': ROUTES.HERO_BANNERS,
  '/content/promotions': ROUTES.PROMOTIONS,
  '/content/static-pages': ROUTES.STATIC_PAGES,
  '/content/settings': ROUTES.CMS_SETTINGS,
  '/content/faqs': ROUTES.FAQS,
  '/content/announcements': ROUTES.ANNOUNCEMENTS,
  '/content/explore-discovery': ROUTES.EXPLORE_DISCOVERY,
};
