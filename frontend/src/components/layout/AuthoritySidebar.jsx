import React from 'react';
import Avatar from '../primitives/Avatar';
import {
  LayoutDashboard,
  CheckSquare,
  Wrench,
  BarChart3,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function AuthoritySidebar({
  activeTab = 'dashboard', // 'dashboard' | 'triage' | 'work-orders' | 'analytics'
  onSelectTab,
  officer = {
    name: 'Rajesh Kumar',
    role: 'Executive Engineer',
    department: 'Roads & Infrastructure',
    ward: 'Ward K-West',
  },
  pendingCount = 14,
  overdueCount = 2,
  className = '',
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Authority Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'triage',
      label: 'Verification Queue',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingCount,
    },
    {
      id: 'work-orders',
      label: 'Department Orders',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'SLA & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <aside className={`w-full flex flex-col gap-5 text-left ${className}`}>
      {/* Officer Profile Card */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-4 shadow-subtle flex items-center gap-3">
        <Avatar name={officer?.name || 'Officer'} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm text-text truncate">
              {officer?.name || 'Rajesh Kumar'}
            </h4>
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <p className="text-[11px] font-semibold text-primary truncate mt-0.5">
            {officer?.role || 'Executive Engineer'}
          </p>
          <p className="text-[10px] text-muted truncate mt-0.5">
            {officer?.department} &bull; {officer?.ward}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-surface-lowest rounded-2xl border border-outline-variant p-2 shadow-subtle flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab && onSelectTab(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary-container text-surface-lowest shadow-subtle'
                  : 'text-text hover:bg-surface-low active:bg-surface-high'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-accent' : 'text-muted'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-accent text-accent-dark'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SLA Status Widget */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-4 shadow-subtle flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold text-text">
          <span className="flex items-center gap-1 text-primary">
            <Clock className="w-4 h-4" /> SLA Benchmark
          </span>
          <span className="text-[10px] text-muted">Ward K-West</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-low">
            <span className="text-text">Pending Triage</span>
            <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {pendingCount}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-low">
            <span className="text-text flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-error" /> Overdue SLAs
            </span>
            <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {overdueCount}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

