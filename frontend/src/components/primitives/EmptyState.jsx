import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon = <Inbox className="w-10 h-10 text-muted" />,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-outline-variant/80 bg-surface-lowest/50 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-low flex items-center justify-center mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-bold text-text mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="inline-flex">{action}</div>}
    </div>
  );
}

