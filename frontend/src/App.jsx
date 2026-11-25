import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/primitives/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ROLES } from './constants.js';

// Layouts
import CitizenLayout from './components/layout/CitizenLayout.jsx';
import AuthorityLayout from './components/layout/AuthorityLayout.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import IssueDetailPage from './pages/IssueDetailPage.jsx';
import MyReportsPage from './pages/MyReportsPage.jsx';
import AuthorityDashboardPage from './pages/AuthorityDashboardPage.jsx';
import AuthorityIssuesPage from './pages/AuthorityIssuesPage.jsx';
import AuthorityReviewPage from './pages/AuthorityReviewPage.jsx';
import ComponentShowcase from './pages/ComponentShowcase.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Hidden Style Guide & Component Library */}
            <Route path="/_components" element={<ComponentShowcase />} />

            {/* Citizen Protected Routes (Wrapped in CitizenLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <CitizenLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<FeedPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/issues/:id" element={<IssueDetailPage />} />
              <Route path="/my-reports" element={<MyReportsPage />} />
            </Route>

            {/* Authority Protected Routes (Requires Authority Role + AuthorityLayout) */}
            <Route
              element={
                <ProtectedRoute requiredRole={ROLES.AUTHORITY}>
                  <AuthorityLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/authority" element={<AuthorityDashboardPage />} />
              <Route path="/authority/issues" element={<AuthorityIssuesPage />} />
              <Route path="/authority/issues/:id" element={<AuthorityReviewPage />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
