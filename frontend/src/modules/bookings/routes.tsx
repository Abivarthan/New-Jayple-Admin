import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const BookingList = lazy(() => import('./pages/BookingList'));
const BookingMonitor = lazy(() =>
  import('./pages/BookingMonitor').then((m) => ({ default: m.BookingMonitor }))
);
const AutoAccepted = lazy(() =>
  import('./pages/AutoAccepted').then((m) => ({ default: m.AutoAcceptedReview }))
);
const DelayedServices = lazy(() =>
  import('./pages/DelayedServices').then((m) => ({ default: m.DelayedServices }))
);
const CallWorkflow = lazy(() =>
  import('./pages/CallWorkflow').then((m) => ({ default: m.CallWorkflow }))
);

const Fallback = <LoadingSpinner message="Loading bookings..." />;

export const bookingRoutes: RouteObject[] = [
  {
    path: 'bookings',
    element: <Suspense fallback={Fallback}><BookingList /></Suspense>,
  },
  {
    path: 'bookings/monitor',
    element: <Suspense fallback={Fallback}><BookingMonitor /></Suspense>,
  },
  {
    path: 'bookings/auto-accepted',
    element: <Suspense fallback={Fallback}><AutoAccepted /></Suspense>,
  },
  {
    path: 'bookings/delayed',
    element: <Suspense fallback={Fallback}><DelayedServices /></Suspense>,
  },
  {
    path: 'bookings/calls',
    element: <Suspense fallback={Fallback}><CallWorkflow /></Suspense>,
  },
];
