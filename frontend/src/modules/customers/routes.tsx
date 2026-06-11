import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const CustomerList = lazy(() =>
  import('./pages/CustomerList').then((m) => ({ default: m.Users }))
);
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));

const Fallback = <LoadingSpinner message="Loading customers..." />;

export const customerRoutes: RouteObject[] = [
  {
    path: 'customers',
    element: <Suspense fallback={Fallback}><CustomerList /></Suspense>,
  },
  {
    path: 'customers/:id',
    element: <Suspense fallback={Fallback}><CustomerDetail /></Suspense>,
  },
];
