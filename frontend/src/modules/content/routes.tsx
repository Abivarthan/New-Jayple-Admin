import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const HomeContent = lazy(() =>
  import('./pages/HomeContent').then((m) => ({ default: m.HomeContent }))
);
const HeroBanners = lazy(() =>
  import('./pages/HeroBanners').then((m) => ({ default: m.HeroBanners }))
);

const Fallback = <LoadingSpinner message="Loading content..." />;

export const contentRoutes: RouteObject[] = [
  { path: 'content/home',             element: <Suspense fallback={Fallback}><HomeContent /></Suspense> },
  { path: 'content/hero-banners',     element: <Suspense fallback={Fallback}><HeroBanners /></Suspense> },
];
