import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  helperText,
  error,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  required = false,
  value,
  id: customId,
  className = '',
  wrapperClassName = '',
  onChange,
  children,
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
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full appearance-none bg-surface-low text-text text-sm rounded-lg border pl-3.5 pr-10 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            error
              ? 'border-error focus:ring-error text-error focus:border-error'
              : 'border-outline-variant focus:border-primary focus:ring-primary'
          } ${disabled ? 'opacity-60 bg-surface-high/50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
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

