import React, { useId } from 'react';

export default function Input({
  label,
  helperText,
  error,
  startIcon,
  endIcon,
  disabled = false,
  required = false,
  id: customId,
  className = '',
  wrapperClassName = '',
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className={`flex flex-col gap-1.5 text-left w-full ${wrapperClassName}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-text flex items-center gap-1">
          {label}
          {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted">
            {startIcon}
          </div>
        )}

        <input
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-surface-low text-text text-sm rounded-lg border transition-all placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            startIcon ? 'pl-9' : 'pl-3.5'
          } ${endIcon ? 'pr-9' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-error focus:ring-error text-error focus:border-error'
              : 'border-outline-variant focus:border-primary focus:ring-primary'
          } ${disabled ? 'opacity-60 bg-surface-high/50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />

        {endIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-muted">
            {endIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-error">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

