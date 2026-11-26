
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../constants.js';

export default function ProtectedRoute({ requiredRole, children }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  // Wait for Firebase to restore the user's session.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted">
            Loading your SWADESH account...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    requiredRole === ROLES.AUTHORITY &&
    role !== ROLES.AUTHORITY
  ) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
