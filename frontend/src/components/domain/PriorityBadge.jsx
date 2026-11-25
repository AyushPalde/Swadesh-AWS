import React from 'react';
import { PRIORITY, PRIORITY_LABELS } from '../../constants';
import { AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const PRIORITY_STYLES = {
  [PRIORITY.HIGH]: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <AlertCircle className="w-3 h-3 text-rose-600" />,
  },
  [PRIORITY.MEDIUM]: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <ArrowUp className="w-3 h-3 text-amber-600" />,
  },
  [PRIORITY.LOW]: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <ArrowDown className="w-3 h-3 text-emerald-600" />,
  },
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export default function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  className = '',
}) {
  if (!priority) return null;

  const style = PRIORITY_STYLES[priority] || {
    badge: 'bg-surface-high text-muted border-outline-variant',
    icon: <Minus className="w-3 h-3 text-muted" />,
  };
  const label = PRIORITY_LABELS[priority] || priority;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border tracking-tight ${style.badge} ${sizeClass} ${className}`}
    >
      {showIcon && style.icon}
      <span>{label}</span>
    </span>
  );
}

