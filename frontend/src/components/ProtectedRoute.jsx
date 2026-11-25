import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../constants.js';

/**
 * ProtectedRoute component:
 * - Redirects unauthenticated users to /login
 * - Redirects citizen users trying to access authority routes back to /
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authority role is required and user is a citizen, redirect to citizen home
  if (requiredRole === ROLES.AUTHORITY && role !== ROLES.AUTHORITY) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
