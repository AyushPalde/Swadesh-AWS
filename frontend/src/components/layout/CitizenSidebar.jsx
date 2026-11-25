import React from 'react';
import Avatar from '../primitives/Avatar';
import Button from '../primitives/Button';
import {
  Compass,
  FileText,
  PlusCircle,
  PhoneCall,
  ShieldCheck,
  MapPin,
  LogOut,
} from 'lucide-react';

export default function CitizenSidebar({
  activeTab = 'feed', // 'feed' | 'my-reports' | 'report'
  onSelectTab,
  onReportClick,
  onLogout,
  user = { name: 'Asha Patil', ward: 'Ward K-West, Mumbai' },
  className = '',
}) {
  const navItems = [
    { id: 'feed', label: 'Civic Feed', icon: <Compass className="w-4 h-4" /> },
    { id: 'my-reports', label: 'My Reports', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <aside className={`w-full flex flex-col gap-5 text-left ${className}`}>
      {/* Citizen Profile Card */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-4 shadow-subtle flex items-center gap-3">
        <Avatar name={user?.name || 'Asha Patil'} size="md" />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-text truncate">
            {user?.name || 'Asha Patil'}
          </h4>
          <div className="flex items-center gap-1 text-[11px] text-muted truncate mt-0.5">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{user?.ward || 'Ward K-West, Mumbai'}</span>
          </div>
          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Resident</span>
          </div>
        </div>
      </div>

      {/* Main Action CTA: Report an Issue */}
      <Button
        variant="primary"
        size="lg"
        onClick={onReportClick || (() => onSelectTab && onSelectTab('report'))}
        startIcon={<PlusCircle className="w-5 h-5 text-accent" />}
        className="w-full justify-center shadow-elevated py-3"
      >
        Report Civic Issue
      </Button>

      {/* Navigation Links */}
      <nav className="bg-surface-lowest rounded-2xl border border-outline-variant p-2 shadow-subtle flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab && onSelectTab(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary-container text-surface-lowest shadow-subtle'
                  : 'text-text hover:bg-surface-low active:bg-surface-high'
              }`}
            >
              <span className={isActive ? 'text-accent' : 'text-muted'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-error hover:bg-error-container/30 active:bg-error-container/50 transition-colors mt-1 pt-2 border-t border-outline-variant/60"
          >
            <LogOut className="w-4 h-4 text-error" />
            <span>Sign Out</span>
          </button>
        )}
      </nav>

      {/* 24x7 Emergency Civics Helpline Callout */}
      <div className="bg-surface-lowest rounded-2xl border border-error/20 p-4 shadow-subtle flex flex-col gap-2.5 bg-gradient-to-br from-error-container/30 to-surface-lowest">
        <div className="flex items-center gap-1.5 text-error">
          <PhoneCall className="w-4 h-4" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">
            Emergency Civics
          </span>
        </div>
        <div>
          <h5 className="text-xs font-bold text-text">Immediate Life Hazard?</h5>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
            For exposed electric wires, severe water main burst, or deep road cave-in:
          </p>
        </div>
        <div className="bg-surface-lowest p-2.5 rounded-xl border border-outline-variant/60 flex items-center justify-between mt-1">
          <div>
            <div className="text-[10px] text-muted">Ward Control Room</div>
            <div className="text-base font-extrabold text-primary leading-tight">1916</div>
          </div>
          <a
            href="tel:1916"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-subtle"
          >
            Call
          </a>
        </div>
      </div>
    </aside>
  );
}

