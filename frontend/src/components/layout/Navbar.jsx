import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Avatar from '../primitives/Avatar';
import {
  Search,
  Bell,
  Menu,
  Sparkles,
  Shield,
  LogOut,
  ChevronDown,
  FileText,
  PlusCircle,
  LayoutDashboard,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants';

export default function Navbar({
  user,
  onMenuToggle,
  onSearch,
  searchValue = '',
  notificationCount = 2,
  onLogout,
  className = '',
}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const activeUser = user || auth?.user;
  const isAuthority = activeUser?.role === ROLES.AUTHORITY;

  const handleLogout = () => {
    setUserMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else if (auth?.logout) {
      auth.logout();
      navigate('/login');
    }
  };

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(internalSearch);
  };

  return (
    <header className={`sticky top-0 z-40 bg-surface-lowest border-b border-outline-variant/60 shadow-subtle ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Left: Brand Identity & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg text-text hover:bg-surface-high transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to={isAuthority ? '/authority' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary text-surface-lowest flex items-center justify-center font-extrabold text-lg shadow-subtle group-hover:scale-105 transition-transform">
              स्व
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-base md:text-lg tracking-tight text-primary leading-none">
                SWADESH
              </span>
              <span className="text-[10px] font-semibold text-muted tracking-wider uppercase mt-0.5">
                {isAuthority ? 'Authority Control Portal' : 'Civic Redressal Portal'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-md mx-4"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Search civic issues by ward, title, or category..."
              className="w-full bg-surface-low text-text text-xs rounded-full pl-9 pr-4 py-2 border border-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted/60"
            />
          </div>
        </form>

        {/* Right: Notifications, UI Kit shortcut, User Menu & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Styleguide link */}
          <Link
            to="/_components"
            title="Open Component Styleguide"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-low border border-outline-variant text-text hover:bg-surface-high transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-dark" />
            <span>UI Kit</span>
          </Link>

          {/* Notifications Bell */}
          <button
            type="button"
            aria-label="View notifications"
            className="relative p-2 rounded-xl text-text hover:bg-surface-low transition-colors"
          >
            <Bell className="w-5 h-5 text-muted hover:text-text" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface-lowest" />
            )}
          </button>

          {/* User Profile Chip & Interactive Dropdown */}
          <div className="relative flex items-center pl-2 border-l border-outline-variant/60" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-label="Toggle user account menu"
              className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-surface-low active:bg-surface-high transition-colors text-left group"
            >
              <Avatar name={activeUser?.name || 'User'} size="sm" />
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-xs text-text leading-tight truncate max-w-[120px] group-hover:text-primary transition-colors">
                  {activeUser?.name || 'Asha Patil'}
                </span>
                <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
                  {isAuthority ? (
                    <span className="text-primary font-bold inline-flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Authority
                    </span>
                  ) : (
                    'Citizen'
                  )}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 hidden sm:block ${
                  userMenuOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>

            {/* Quick 1-Click Logout Icon Button for Header */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out / Logout"
              className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 text-muted hover:text-error hover:bg-error-container/20 rounded-xl transition-colors text-xs font-bold"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 text-error shrink-0" />
              <span className="hidden lg:inline text-error text-[11px]">Sign Out</span>
            </button>

            {/* Dropdown Menu Modal/Card */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-lowest border border-outline-variant shadow-floating py-2 z-50 text-left">
                {/* User Details Header */}
                <div className="px-4 py-3 border-b border-outline-variant/60 bg-surface-low/30">
                  <p className="font-bold text-xs text-text truncate">
                    {activeUser?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {activeUser?.email || (isAuthority ? 'authority@mcgm.gov.in' : 'citizen@example.com')}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isAuthority
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-accent/20 text-accent-dark border border-accent/30'
                      }`}
                    >
                      {isAuthority ? <Shield className="w-3 h-3" /> : null}
                      {isAuthority ? 'Municipal Authority' : 'Verified Resident'}
                    </span>
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <div className="py-1.5">
                  {isAuthority ? (
                    <>
                      <Link
                        to="/authority"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-text hover:bg-surface-low transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        <span>Triage Dashboard</span>
                      </Link>
                      <Link
                        to="/authority/issues"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-text hover:bg-surface-low transition-colors"
                      >
                        <CheckSquare className="w-4 h-4 text-primary" />
                        <span>All Ward Issues</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/my-reports"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-text hover:bg-surface-low transition-colors"
                      >
                        <FileText className="w-4 h-4 text-primary" />
                        <span>My Reported Issues</span>
                      </Link>
                      <Link
                        to="/report"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-text hover:bg-surface-low transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-accent-dark" />
                        <span>Report New Issue</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Logout Option */}
                <div className="border-t border-outline-variant/60 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-error hover:bg-error-container/30 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </span>
                    <span className="text-[10px] text-muted font-normal">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
