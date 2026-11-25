import React from 'react';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

const COLORS = {
  primary: 'border-primary/20 border-t-primary',
  accent: 'border-accent/20 border-t-accent',
  white: 'border-white/30 border-t-white',
  current: 'border-current/20 border-t-current',
};

export default function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  label = 'Loading...',
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const colorClass = COLORS[color] || COLORS.primary;

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-block rounded-full animate-spin ${sizeClass} ${colorClass} ${className}`}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

