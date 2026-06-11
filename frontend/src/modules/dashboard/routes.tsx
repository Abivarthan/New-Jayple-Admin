import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const DashboardOverview = lazy(() =>
  import('./pages/DashboardOverview').then((m) => ({ default: m.Dashboard }))
);

const Fallback = <LoadingSpinner message="Loading dashboard..." />;

export const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: <Suspense fallback={Fallback}><DashboardOverview /></Suspense>,
  },
];
