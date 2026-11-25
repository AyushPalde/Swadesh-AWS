import React from 'react';
import { STATUS } from '../../constants';
import { Check, XCircle } from 'lucide-react';

const STAGES = [
  { key: STATUS.PENDING_VERIFICATION, label: 'Reported', subtitle: 'Pending Triage' },
  { key: STATUS.VERIFIED, label: 'Verified', subtitle: 'Priority Set' },
  { key: STATUS.ASSIGNED, label: 'Assigned', subtitle: 'Dept Dispatched' },
  { key: STATUS.IN_PROGRESS, label: 'In Progress', subtitle: 'On-site Work' },
  { key: STATUS.RESOLVED, label: 'Resolved', subtitle: 'Closed & Fixed' },
];

export default function ProgressStepper({
  currentStatus = STATUS.PENDING_VERIFICATION,
  className = '',
}) {
  const isRejected = currentStatus === STATUS.REJECTED;

  // Find index in 5 standard stages
  const currentIndex = STAGES.findIndex((s) => s.key === currentStatus);
  // Default to 0 if not found or pending
  const activeStep = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className={`bg-surface-low rounded-2xl border border-outline-variant p-4 sm:p-5 flex flex-col gap-3 ${className}`}>
      {/* Top Header: Current Phase Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted">Progress Lifecycle:</span>
        {isRejected ? (
          <span className="font-bold text-error flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Issue Rejected by Authority
          </span>
        ) : (
          <span className="font-bold text-primary">
            Stage {activeStep + 1} of 5 &bull; {STAGES[activeStep]?.subtitle}
          </span>
        )}
      </div>

      {/* Stepper Bar */}
      {isRejected ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            This grievance was reviewed and rejected. Please refer to the audit timeline for the official municipal note.
          </span>
        </div>
      ) : (
        <div className="relative flex items-center justify-between w-full pt-1 pb-2">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;
            const isFuture = idx > activeStep;

            return (
              <React.Fragment key={stage.key}>
                {/* Step Node */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCompleted
                        ? 'bg-primary text-surface-lowest'
                        : isCurrent
                        ? 'bg-accent text-accent-dark ring-4 ring-accent/30 font-extrabold'
                        : 'bg-surface-high text-muted border border-outline-variant'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-semibold mt-1.5 text-center leading-tight max-w-[65px] sm:max-w-none ${
                      isCurrent
                        ? 'text-primary font-bold'
                        : isCompleted
                        ? 'text-text'
                        : 'text-muted'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Connector Line between Steps */}
                {idx < STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 -mt-5 mx-1 transition-colors ${
                      idx < activeStep ? 'bg-primary' : 'bg-outline-variant/60'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

