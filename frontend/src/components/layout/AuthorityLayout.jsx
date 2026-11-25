import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../primitives/Avatar.jsx';
import {
  LayoutDashboard,
  ClipboardList,
  Shield,
  Bell,
  Search,
  LogOut,
  Sparkles,
  Building2,
  Clock,
  Menu,
  X,
} from 'lucide-react';

export default function AuthorityLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    {
      to: '/authority',
      label: 'Triage Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      exact: true,
    },
    {
      to: '/authority/issues',
      label: 'All Ward Issues',
      icon: <ClipboardList className="w-5 h-5" />,
      exact: false,
    },
  ];

  const isLinkActive = (to, exact) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col md:flex-row pb-16 md:pb-0">
      {/* DESKTOP DARK SIDEBAR (Matches Stitch 05_authority_dashboard & 07_authority_issue_review) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-[#083636] text-white flex-col justify-between p-5 border-r border-white/10 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F5C5C] to-[#004343] border border-white/20 flex items-center justify-center font-extrabold text-xl text-accent shadow-md">
              स्व
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-lg tracking-tight text-white">
                SWADESH
                <span className="w-2 h-2 rounded-full bg-accent"></span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80">
                Authority Portal
              </span>
            </div>
          </div>

          {/* Officer Persona Card */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
            <Avatar name={user?.name || 'Officer'} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-white truncate">
                  {user?.name || 'Rajesh Kumar'}
                </span>
                <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
              </div>
              <div className="text-[11px] text-teal-200/80 truncate mt-0.5">
                Ward K-West Control
              </div>
              <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded mt-1">
                Executive Officer
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5" aria-label="Authority Navigation">
            {navLinks.map((link) => {
              const active = isLinkActive(link.to, link.exact);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-accent text-accent-dark shadow-subtle'
                      : 'text-teal-100 hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className={active ? 'text-accent-dark' : 'text-teal-300'}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <Link
            to="/_components"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-teal-200 hover:bg-white/5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Component Library</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </span>
            <span className="text-[10px] text-teal-300/60 font-mono">Exit</span>
          </button>
        </div>
      </aside>

      {/* MAIN BODY AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Authority */}
        <header className="sticky top-0 z-30 bg-surface-lowest border-b border-outline-variant/60 shadow-subtle px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="md:hidden font-extrabold text-primary text-lg">SWADESH</span>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Municipal Corporation of Greater Mumbai</span>
              <span>&bull;</span>
              <span className="text-text font-bold">K-West Ward Redressal Grid</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>SLA Target: 48h</span>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="p-2 rounded-xl text-muted hover:text-text hover:bg-surface-low transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface-lowest" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 text-error hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-outline-variant/60 hover:border-error/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-error" />
              <span className="hidden sm:inline text-error text-xs font-bold">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR AUTHORITY */}
      <nav
        aria-label="Authority Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#083636] border-t border-white/10 py-2.5 px-6 flex justify-around items-center md:hidden shadow-floating text-white"
      >
        <Link
          to="/authority"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname === '/authority' ? 'text-accent' : 'text-teal-200 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/authority/issues"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname.startsWith('/authority/issues') ? 'text-accent' : 'text-teal-200 hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>All Issues</span>
        </Link>

        <Link
          to="/_components"
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-teal-200 hover:text-white"
        >
          <Sparkles className="w-5 h-5" />
          <span>UI Kit</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white"
        >
          <LogOut className="w-5 h-5 text-rose-400" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
