import React, { useId } from 'react';

export default function Textarea({
  label,
  helperText,
  error,
  rows = 4,
  disabled = false,
  required = false,
  maxLength,
  showCount = false,
  value,
  id: customId,
  className = '',
  wrapperClassName = '',
  onChange,
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`flex flex-col gap-1.5 text-left w-full ${wrapperClassName}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-text flex items-center gap-1">
            {label}
            {required && <span className="text-error" aria-hidden="true">*</span>}
          </label>
        )}
        {showCount && maxLength && (
          <span className="text-[11px] text-muted">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`w-full bg-surface-low text-text text-sm rounded-lg border p-3 transition-all placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y ${
          error
            ? 'border-error focus:ring-error text-error focus:border-error'
            : 'border-outline-variant focus:border-primary focus:ring-primary'
        } ${disabled ? 'opacity-60 bg-surface-high/50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />

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

