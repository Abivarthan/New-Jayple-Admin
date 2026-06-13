import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const VendorList = lazy(() =>
  import('./pages/VendorList').then((m) => ({ default: m.AllVendors }))
);

const VendorApprovals = lazy(() =>
  import('./pages/VendorApprovals').then((m) => ({ default: m.VendorApprovals }))
);

const Fallback = <LoadingSpinner message="Loading vendors..." />;

export const vendorRoutes: RouteObject[] = [
  {
    path: 'vendors',
    element: <Suspense fallback={Fallback}><VendorList /></Suspense>,
  },
  {
    path: 'vendors/approvals',
    element: <Suspense fallback={Fallback}><VendorApprovals /></Suspense>,
  },
];
