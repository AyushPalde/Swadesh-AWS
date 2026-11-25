import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Navbar from './Navbar.jsx';
import CitizenSidebar from './CitizenSidebar.jsx';
import {
  Home,
  MapPin,
  PlusCircle,
  FileText,
  LogOut,
} from 'lucide-react';

export default function CitizenLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isFeedPage = location.pathname === '/';

  // Determine active tab for sidebar
  const getActiveTab = () => {
    if (location.pathname === '/my-reports') return 'my-reports';
    if (location.pathname === '/report') return 'report';
    return 'feed';
  };

  const handleTabSelect = (tab) => {
    if (tab === 'feed') navigate('/');
    else if (tab === 'my-reports') navigate('/my-reports');
    else if (tab === 'report') navigate('/report');
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col pb-16 md:pb-0">
      {/* Top Main Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onSearch={(q) => {
          navigate(`/?search=${encodeURIComponent(q)}`);
        }}
      />

      {/* Main Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left Column: Citizen Navigation Sidebar */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-22">
            <CitizenSidebar
              activeTab={getActiveTab()}
              onSelectTab={handleTabSelect}
              onReportClick={() => navigate('/report')}
              onLogout={handleLogout}
              user={user}
            />
          </aside>

          {/* Main Outlet (Expands to 9 cols if not Feed, or 6 cols on Feed with right-rail) */}
          <main
            className={`col-span-1 min-w-0 w-full ${
              isFeedPage
                ? 'md:col-span-8 lg:col-span-9'
                : 'md:col-span-8 lg:col-span-9'
            }`}
          >
            <Outlet context={{ user }} />
          </main>

        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Matches Stitch Mobile Screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface-lowest border-t border-outline-variant/60 py-2 px-4 flex justify-around items-center md:hidden shadow-floating"
      >
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            location.pathname === '/' && !location.search.includes('filter=nearby')
              ? 'text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          to="/?filter=nearby"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            location.search.includes('filter=nearby') ? 'text-primary' : 'text-muted hover:text-text'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Nearby</span>
        </Link>

        {/* Center Floating Action Button for Report */}
        <Link
          to="/report"
          className="-mt-5 w-12 h-12 rounded-full bg-primary text-accent flex items-center justify-center shadow-elevated border-3 border-surface-lowest active:scale-95 transition-transform"
          aria-label="Report New Civic Issue"
        >
          <PlusCircle className="w-7 h-7" />
        </Link>

        <Link
          to="/my-reports"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            location.pathname === '/my-reports' ? 'text-primary' : 'text-muted hover:text-text'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>My Reports</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-muted hover:text-error"
        >
          <LogOut className="w-5 h-5 text-error" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
