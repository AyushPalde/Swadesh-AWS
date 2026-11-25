import React from 'react';

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}) {
  const baseClasses = 'animate-pulse bg-surface-high/80 rounded-md';

  const renderSingle = (key) => {
    switch (variant) {
      case 'avatar':
        return (
          <div
            key={key}
            className={`${baseClasses} rounded-full shrink-0 ${className}`}
            style={{ width: width || '2.5rem', height: height || '2.5rem' }}
          />
        );
      case 'card':
        return (
          <div
            key={key}
            className={`${baseClasses} rounded-xl p-4 flex flex-col gap-3 ${className}`}
            style={{ width, height: height || '12rem' }}
          >
            <div className="h-4 bg-outline-variant/40 rounded w-1/3" />
            <div className="h-8 bg-outline-variant/30 rounded w-full" />
            <div className="h-4 bg-outline-variant/30 rounded w-2/3 mt-auto" />
          </div>
        );
      case 'rectangular':
        return (
          <div
            key={key}
            className={`${baseClasses} rounded-lg ${className}`}
            style={{ width: width || '100%', height: height || '6rem' }}
          />
        );
      case 'text':
      default:
        return (
          <div
            key={key}
            className={`${baseClasses} h-4 w-full mb-2 ${className}`}
            style={{ width, height }}
          />
        );
    }
  };

  if (count > 1) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: count }).map((_, i) => renderSingle(i))}
      </div>
    );
  }

  return renderSingle(0);
}

