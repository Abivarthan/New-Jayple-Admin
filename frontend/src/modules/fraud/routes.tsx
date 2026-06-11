import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const FraudFlags = lazy(() =>
  import('./pages/FraudFlags').then((m) => ({ default: m.FraudFlags }))
);
const FraudMonitoring = lazy(() => import('./pages/FraudMonitoring'));
const SuspiciousActivity = lazy(() => import('./pages/SuspiciousActivity'));

const Fallback = <LoadingSpinner message="Loading fraud data..." />;

export const fraudRoutes: RouteObject[] = [
  { path: 'fraud/flags',       element: <Suspense fallback={Fallback}><FraudFlags /></Suspense> },
  { path: 'fraud/monitoring',  element: <Suspense fallback={Fallback}><FraudMonitoring /></Suspense> },
  { path: 'fraud/suspicious',  element: <Suspense fallback={Fallback}><SuspiciousActivity /></Suspense> },
];
