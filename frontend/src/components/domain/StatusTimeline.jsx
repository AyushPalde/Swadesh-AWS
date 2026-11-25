import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import StatusBadge from './StatusBadge';
import { User, Clock, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { STATUS } from '../../constants';

dayjs.extend(relativeTime);

export default function StatusTimeline({
  statusHistory = [],
  className = '',
}) {
  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-surface-low border border-outline-variant text-center text-xs text-muted">
        No status history recorded yet.
      </div>
    );
  }

  // Display chronologically (newest at bottom or top; standard audit log is top-to-bottom)
  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Continuous Track Line */}
      <div
        className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-outline-variant/50"
        aria-hidden="true"
      />

      {statusHistory.map((entry, index) => {
        const isLatest = index === statusHistory.length - 1;
        const isTerminalResolved = entry.status === STATUS.RESOLVED;
        const isTerminalRejected = entry.status === STATUS.REJECTED;

        return (
          <div key={index} className="relative flex flex-col gap-1.5 text-left">
            {/* Timeline Node Dot */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background shadow-xs ${
                isTerminalResolved
                  ? 'bg-status-resolved text-white'
                  : isTerminalRejected
                  ? 'bg-status-rejected text-white'
                  : isLatest
                  ? 'bg-primary text-white'
                  : 'bg-surface-high border border-outline text-muted'
              }`}
            >
              {isTerminalResolved ? (
                <CheckCircle className="w-3 h-3" />
              ) : isTerminalRejected ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
            </div>

            {/* Entry Header: Badge & Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} size="sm" />
                {isLatest && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted">
                <Clock className="w-3 h-3" />
                <span title={entry.at ? dayjs(entry.at).format('YYYY-MM-DD HH:mm:ss') : ''}>
                  {entry.at ? dayjs(entry.at).format('MMM D, YYYY · h:mm A') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Actor Information */}
            {entry.by && (
              <div className="flex items-center gap-1.5 text-xs text-text/80 font-medium">
                <User className="w-3.5 h-3.5 text-muted shrink-0" />
                <span>Updated by: <strong className="text-text">{entry.by}</strong></span>
              </div>
            )}

            {/* Note / Justification */}
            {entry.note && (
              <div className="mt-1 bg-surface-low border border-outline-variant/50 rounded-lg p-2.5 text-xs text-text flex items-start gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                <p className="leading-relaxed whitespace-pre-wrap">{entry.note}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

