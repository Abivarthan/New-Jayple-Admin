import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const Promotions = lazy(() =>
  import('./pages/Promotions').then((m) => ({ default: m.Promotions }))
);
const Coupons = lazy(() => import('./pages/Coupons'));
const Campaigns = lazy(() => import('./pages/Campaigns'));

const Fallback = <LoadingSpinner message="Loading promotions..." />;

export const promotionRoutes: RouteObject[] = [
  { path: 'promotions',          element: <Suspense fallback={Fallback}><Promotions /></Suspense> },
  { path: 'promotions/coupons',  element: <Suspense fallback={Fallback}><Coupons /></Suspense> },
  { path: 'promotions/campaigns',element: <Suspense fallback={Fallback}><Campaigns /></Suspense> },
];
