import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const ServiceRadius = lazy(() =>
  import('./pages/ServiceRadius').then((m) => ({ default: m.ServiceRadius }))
);
const UIConfigEditor = lazy(() =>
  import('./pages/UIConfigEditor').then((m) => ({ default: m.UIConfigEditor }))
);
const PlatformConfig = lazy(() =>
  import('./pages/PlatformConfig').then((m) => ({ default: m.PlatformConfig }))
);
const FeatureFlags = lazy(() => import('./pages/FeatureFlags'));

const Fallback = <LoadingSpinner message="Loading settings..." />;

export const settingsRoutes: RouteObject[] = [
  { path: 'settings/service-radius', element: <Suspense fallback={Fallback}><ServiceRadius /></Suspense> },
  { path: 'settings/ui-config',      element: <Suspense fallback={Fallback}><UIConfigEditor /></Suspense> },
  { path: 'settings/platform-config',element: <Suspense fallback={Fallback}><PlatformConfig /></Suspense> },
  { path: 'settings/feature-flags',  element: <Suspense fallback={Fallback}><FeatureFlags /></Suspense> },
];
