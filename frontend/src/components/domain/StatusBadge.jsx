import React from 'react';
import { STATUS, STATUS_LABELS } from '../../constants';

const STATUS_CONFIGS = {
  [STATUS.PENDING_VERIFICATION]: {
    style: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
    dot: 'bg-status-pending',
  },
  [STATUS.VERIFIED]: {
    style: 'bg-status-verified-bg text-status-verified-text border-status-verified-border',
    dot: 'bg-status-verified',
  },
  [STATUS.ASSIGNED]: {
    style: 'bg-status-assigned-bg text-status-assigned-text border-status-assigned-border',
    dot: 'bg-status-assigned',
  },
  [STATUS.IN_PROGRESS]: {
    style: 'bg-status-in-progress-bg text-status-in-progress-text border-status-in-progress-border',
    dot: 'bg-status-in-progress',
  },
  [STATUS.RESOLVED]: {
    style: 'bg-status-resolved-bg text-status-resolved-text border-status-resolved-border',
    dot: 'bg-status-resolved',
  },
  [STATUS.REJECTED]: {
    style: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
    dot: 'bg-status-rejected',
  },
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export default function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className = '',
}) {
  const config = STATUS_CONFIGS[status] || {
    style: 'bg-surface-high text-muted border-outline-variant',
    dot: 'bg-muted',
  };
  const label = STATUS_LABELS[status] || status || 'Unknown';
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border shadow-xs tracking-tight ${config.style} ${sizeClass} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
}

