import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const AnalyticsDashboard = lazy(() =>
  import('./pages/AnalyticsDashboard').then((m) => ({ default: m.Analytics }))
);
const BookingReports = lazy(() =>
  import('./pages/Reports').then((m) => ({ default: m.BookingReports }))
);
const VendorReports = lazy(() =>
  import('./pages/Reports').then((m) => ({ default: m.VendorReports }))
);
const CustomerReports = lazy(() =>
  import('./pages/Reports').then((m) => ({ default: m.CustomerReports }))
);

const Fallback = <LoadingSpinner message="Loading analytics..." />;

export const analyticsRoutes: RouteObject[] = [
  { path: 'analytics',                  element: <Suspense fallback={Fallback}><AnalyticsDashboard /></Suspense> },
  { path: 'analytics/bookings',         element: <Suspense fallback={Fallback}><BookingReports /></Suspense> },
  { path: 'analytics/vendors',          element: <Suspense fallback={Fallback}><VendorReports /></Suspense> },
  { path: 'analytics/customers',        element: <Suspense fallback={Fallback}><CustomerReports /></Suspense> },
];
