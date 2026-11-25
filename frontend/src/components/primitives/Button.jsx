import React from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-primary text-surface-lowest hover:bg-primary-hover active:bg-primary-dark shadow-subtle focus-visible:ring-primary',
  secondary:
    'bg-accent text-accent-dark hover:bg-accent-hover active:bg-accent-dark/90 shadow-subtle focus-visible:ring-accent font-bold',
  ghost:
    'bg-transparent text-text hover:bg-surface-high/60 active:bg-surface-high border border-outline-variant/60 focus-visible:ring-outline',
  danger:
    'bg-error text-surface-lowest hover:bg-error/90 active:bg-error/80 shadow-subtle focus-visible:ring-error',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-bold rounded-xl gap-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  startIcon = null,
  endIcon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClass} ${sizeClass} ${
        isDisabled ? 'opacity-60 cursor-not-allowed shadow-none' : 'cursor-pointer active:scale-[0.99]'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            color={variant === 'secondary' ? 'current' : 'white'}
          />
          <span>{children}</span>
        </>
      ) : (
        <>
          {startIcon && <span className="inline-flex shrink-0">{startIcon}</span>}
          <span>{children}</span>
          {endIcon && <span className="inline-flex shrink-0">{endIcon}</span>}
        </>
      )}
    </button>
  );
}

