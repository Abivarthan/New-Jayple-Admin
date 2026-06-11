import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const Settlements = lazy(() =>
  import('./pages/Settlements').then((m) => ({ default: m.Settlements }))
);
const RefundCases = lazy(() =>
  import('./pages/RefundCases').then((m) => ({ default: m.RefundCases }))
);
const Transactions = lazy(() => import('./pages/Transactions'));
const RevenueReports = lazy(() => import('./pages/RevenueReports'));

const Fallback = <LoadingSpinner message="Loading finance..." />;

export const financeRoutes: RouteObject[] = [
  { path: 'finance/settlements', element: <Suspense fallback={Fallback}><Settlements /></Suspense> },
  { path: 'finance/refunds',     element: <Suspense fallback={Fallback}><RefundCases /></Suspense> },
  { path: 'finance/transactions',element: <Suspense fallback={Fallback}><Transactions /></Suspense> },
  { path: 'finance/revenue',     element: <Suspense fallback={Fallback}><RevenueReports /></Suspense> },
];
