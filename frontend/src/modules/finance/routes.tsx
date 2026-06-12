import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const Settlements = lazy(() =>
  import('./pages/Settlements').then((m) => ({ default: m.Settlements }))
);
const RefundCases = lazy(() =>
  import('./pages/RefundCases').then((m) => ({ default: m.RefundCases }))
);

const Fallback = <LoadingSpinner message="Loading finance..." />;

export const financeRoutes: RouteObject[] = [
  { path: 'finance/settlements', element: <Suspense fallback={Fallback}><Settlements /></Suspense> },
  { path: 'finance/refunds',     element: <Suspense fallback={Fallback}><RefundCases /></Suspense> },
];
