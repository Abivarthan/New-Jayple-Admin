import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const Categories = lazy(() =>
  import('./pages/Categories').then((m) => ({ default: m.Categories }))
);
const SubCategories = lazy(() => import('./pages/SubCategories'));
const ImageLibrary = lazy(() =>
  import('./pages/ImageLibrary').then((m) => ({ default: m.ImageLibrary }))
);

const Fallback = <LoadingSpinner message="Loading catalog..." />;

export const catalogRoutes: RouteObject[] = [
  {
    path: 'catalog/categories',
    element: <Suspense fallback={Fallback}><Categories /></Suspense>,
  },
  {
    path: 'catalog/sub-categories',
    element: <Suspense fallback={Fallback}><SubCategories /></Suspense>,
  },
  {
    path: 'catalog/image-library',
    element: <Suspense fallback={Fallback}><ImageLibrary /></Suspense>,
  },
];
