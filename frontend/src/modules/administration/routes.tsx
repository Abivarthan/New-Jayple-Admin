import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/feedback/LoadingSpinner';

const AdminUsers = lazy(() =>
  import('./pages/AdminPages').then((m) => ({ default: m.AdminUsers }))
);
const RolesPermissions = lazy(() =>
  import('./pages/AdminPages').then((m) => ({ default: m.RolesPermissions }))
);
const AuditLog = lazy(() =>
  import('./pages/AdminPages').then((m) => ({ default: m.AuditLog }))
);
const ActivityLogs = lazy(() =>
  import('./pages/AdminPages').then((m) => ({ default: m.ActivityLogs }))
);

const Fallback = <LoadingSpinner message="Loading administration..." />;

export const administrationRoutes: RouteObject[] = [
  { path: 'admin/users',         element: <Suspense fallback={Fallback}><AdminUsers /></Suspense> },
  { path: 'admin/roles',         element: <Suspense fallback={Fallback}><RolesPermissions /></Suspense> },
  { path: 'admin/audit-log',     element: <Suspense fallback={Fallback}><AuditLog /></Suspense> },
  { path: 'admin/activity-logs', element: <Suspense fallback={Fallback}><ActivityLogs /></Suspense> },
];
