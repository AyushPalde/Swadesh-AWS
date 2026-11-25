import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
  error: <AlertCircle className="w-5 h-5 text-rose-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  info: <Info className="w-5 h-5 text-sky-600" />,
};

const TOAST_STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
  error: 'bg-rose-50 border-rose-200 text-rose-950',
  warning: 'bg-amber-50 border-amber-200 text-amber-950',
  info: 'bg-sky-50 border-sky-200 text-sky-950',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = 'info', duration = 4000 }) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      const newToast = { id, title, message, type };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    show: (props) => addToast(props),
    success: (message, title = 'Success') => addToast({ type: 'success', message, title }),
    error: (message, title = 'Error') => addToast({ type: 'error', message, title }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', message, title }),
    info: (message, title = 'Info') => addToast({ type: 'info', message, title }),
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Notification Container */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          const icon = TOAST_ICONS[t.type] || TOAST_ICONS.info;

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-floating transition-all animate-in slide-in-from-bottom-2 ${style}`}
            >
              <span className="shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                {t.title && <h5 className="text-xs font-bold leading-tight">{t.title}</h5>}
                {t.message && (
                  <p className="text-xs text-text/80 mt-0.5 leading-relaxed break-words">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-text/50 hover:text-text p-1 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

