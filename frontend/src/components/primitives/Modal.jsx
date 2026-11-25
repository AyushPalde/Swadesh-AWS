import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  const titleId = useId();
  const descId = useId();

  // Handle ESC key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${sizeClass} bg-surface-lowest rounded-2xl shadow-floating border border-outline-variant overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-outline-variant/40 bg-surface-low/50">
          <div>
            {title && (
              <h3 id={titleId} className="text-lg font-bold text-text">
                {title}
              </h3>
            )}
            {description && (
              <p id={descId} className="text-xs text-muted mt-1">
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-sm text-text">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-surface-low border-t border-outline-variant/40 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

