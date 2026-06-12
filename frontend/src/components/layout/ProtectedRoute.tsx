import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AdminPermission } from '../../../../shared/src/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: AdminPermission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, adminProfile, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 text-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="text-sm font-medium animate-pulse">Loading secure session...</p>
        </div>
      </div>
    );
  }

  if (!user || !adminProfile) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to unauthorized page if permissions are missing
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
