import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const VARIANTS = {
  primary: {
    bg: 'bg-surface-lowest',
    iconBg: 'bg-primary/10 text-primary',
    accentText: 'text-primary',
  },
  accent: {
    bg: 'bg-surface-lowest',
    iconBg: 'bg-accent/20 text-accent-dark',
    accentText: 'text-accent-dark',
  },
  emerald: {
    bg: 'bg-surface-lowest',
    iconBg: 'bg-emerald-100 text-emerald-800',
    accentText: 'text-emerald-700',
  },
  rose: {
    bg: 'bg-surface-lowest',
    iconBg: 'bg-rose-100 text-rose-800',
    accentText: 'text-rose-700',
  },
  blue: {
    bg: 'bg-surface-lowest',
    iconBg: 'bg-sky-100 text-sky-800',
    accentText: 'text-sky-700',
  },
};

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendDirection = 'up',
  variant = 'primary',
  className = '',
}) {
  const currentVariant = VARIANTS[variant] || VARIANTS.primary;

  return (
    <div
      className={`p-5 rounded-2xl border border-outline-variant shadow-card hover:shadow-elevated transition-all flex flex-col justify-between ${currentVariant.bg} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mt-1">
            {value}
          </div>
        </div>

        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/30 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                trendDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trendDirection === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {trend}
            </span>
          )}
          {subtitle && <span className="text-muted truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

