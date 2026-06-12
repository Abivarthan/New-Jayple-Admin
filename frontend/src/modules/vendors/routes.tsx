import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const VendorList = lazy(() =>
  import('./pages/VendorList').then((m) => ({ default: m.AllVendors }))
);

const Fallback = <LoadingSpinner message="Loading vendors..." />;

export const vendorRoutes: RouteObject[] = [
  {
    path: 'vendors',
    element: <Suspense fallback={Fallback}><VendorList /></Suspense>,
  },
];
