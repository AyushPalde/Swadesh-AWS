import React from 'react';

export default function FilterChip({
  label,
  count,
  icon,
  active = false,
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? 'bg-primary-container text-surface-lowest shadow-subtle border border-primary'
          : 'bg-surface-lowest text-text border border-outline-variant hover:bg-surface-high/60 active:bg-surface-high'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && count !== null && (
        <span
          className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
            active
              ? 'bg-accent text-accent-dark'
              : 'bg-surface-high text-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

