import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const AnalyticsDashboard = lazy(() =>
  import('./pages/AnalyticsDashboard').then((m) => ({ default: m.Analytics }))
);

const Fallback = <LoadingSpinner message="Loading analytics..." />;

export const analyticsRoutes: RouteObject[] = [
  { path: 'analytics',                  element: <Suspense fallback={Fallback}><AnalyticsDashboard /></Suspense> },
];
