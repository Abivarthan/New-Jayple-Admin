import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const HomeContent = lazy(() =>
  import('./pages/HomeContent').then((m) => ({ default: m.HomeContent }))
);
const HeroBanners = lazy(() =>
  import('./pages/HeroBanners').then((m) => ({ default: m.HeroBanners }))
);
const StaticPages = lazy(() =>
  import('./pages/StaticPages').then((m) => ({ default: m.StaticPages }))
);
const Faqs = lazy(() =>
  import('./pages/Faqs').then((m) => ({ default: m.Faqs }))
);
const Announcements = lazy(() =>
  import('./pages/Announcements').then((m) => ({ default: m.Announcements }))
);
const ExploreDiscovery = lazy(() =>
  import('./pages/ExploreDiscovery').then((m) => ({ default: m.ExploreDiscovery }))
);
const CMSSettings = lazy(() =>
  import('./pages/CMSSettings').then((m) => ({ default: m.CMSSettings }))
);
const LandingPages = lazy(() => import('./pages/LandingPages'));

const Fallback = <LoadingSpinner message="Loading content..." />;

export const contentRoutes: RouteObject[] = [
  { path: 'content/home',             element: <Suspense fallback={Fallback}><HomeContent /></Suspense> },
  { path: 'content/hero-banners',     element: <Suspense fallback={Fallback}><HeroBanners /></Suspense> },
  { path: 'content/static-pages',     element: <Suspense fallback={Fallback}><StaticPages /></Suspense> },
  { path: 'content/faqs',             element: <Suspense fallback={Fallback}><Faqs /></Suspense> },
  { path: 'content/announcements',    element: <Suspense fallback={Fallback}><Announcements /></Suspense> },
  { path: 'content/explore-discovery',element: <Suspense fallback={Fallback}><ExploreDiscovery /></Suspense> },
  { path: 'content/settings',         element: <Suspense fallback={Fallback}><CMSSettings /></Suspense> },
  { path: 'content/landing-pages',    element: <Suspense fallback={Fallback}><LandingPages /></Suspense> },
];
