import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface-lowest p-8 rounded-3xl border border-outline-variant shadow-card text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
            HTTP 404 Error
          </span>
          <h1 className="text-2xl font-extrabold text-text mt-1">Page Not Found</h1>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            The civic page you are looking for does not exist or has been moved to another ward jurisdiction.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-subtle"
          >
            <Home className="w-4 h-4" /> Return to Citizen Feed
          </Link>
        </div>
      </div>
    </div>
  );
}

