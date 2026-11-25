import React, { useState } from 'react';

const SIZES = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
};

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  src,
  name = 'User',
  alt,
  size = 'md',
  className = '',
}) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;
  const initials = getInitials(name);

  // Deterministic soft color hash based on name
  const colors = [
    'bg-primary-container text-primary-light',
    'bg-[#005785] text-[#93CCFF]',
    'bg-[#855300] text-[#FFDDB8]',
    'bg-[#004F50] text-[#ACEEEE]',
    'bg-[#5C3C00] text-[#FFE088]',
  ];
  const colorIndex = (name || '').charCodeAt(0) % colors.length;
  const colorClass = colors[colorIndex] || colors[0];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden font-bold select-none shrink-0 ${sizeClass} ${colorClass} ${className}`}
      title={name}
      aria-label={alt || name}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

