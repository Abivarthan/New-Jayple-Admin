import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { LEGACY_REDIRECTS } from '../shared/constants/routes';

// ── Module route imports ───────────────────────────────────────────────────────
import { dashboardRoutes }      from '../modules/dashboard/routes';
import { customerRoutes }       from '../modules/customers/routes';
import { vendorRoutes }         from '../modules/vendors/routes';
import { bookingRoutes }        from '../modules/bookings/routes';
import { catalogRoutes }        from '../modules/catalog/routes';
import { contentRoutes }        from '../modules/content/routes';
import { promotionRoutes }      from '../modules/promotions/routes';
import { financeRoutes }        from '../modules/finance/routes';
import { fraudRoutes }          from '../modules/fraud/routes';
import { analyticsRoutes }      from '../modules/analytics/routes';
import { settingsRoutes }       from '../modules/settings/routes';
import { administrationRoutes } from '../modules/administration/routes';

// ── Legacy redirect routes (old URLs → new module paths) ─────────────────────
const legacyRedirectRoutes: RouteObject[] = Object.entries(LEGACY_REDIRECTS).map(
  ([from, to]) => ({
    path: from.replace(/^\//, ''), // strip leading slash (nested under "/")
    element: <Navigate to={to} replace />,
  }),
);

// ── Aggregated module routes ───────────────────────────────────────────────────
export const moduleRoutes: RouteObject[] = [
  ...dashboardRoutes,
  ...customerRoutes,
  ...vendorRoutes,
  ...bookingRoutes,
  ...catalogRoutes,
  ...contentRoutes,
  ...promotionRoutes,
  ...financeRoutes,
  ...fraudRoutes,
  ...analyticsRoutes,
  ...settingsRoutes,
  ...administrationRoutes,
  ...legacyRedirectRoutes,
];
