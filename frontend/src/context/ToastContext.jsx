import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const variantStyles = {
  success: {
    icon: CheckCircle2,
    cardClassName: "border-emerald-400/20 bg-emerald-500/10 text-emerald-50",
    iconClassName: "text-emerald-300",
  },
  error: {
    icon: AlertCircle,
    cardClassName: "border-rose-400/20 bg-rose-500/10 text-rose-50",
    iconClassName: "text-rose-300",
  },
  info: {
    icon: Info,
    cardClassName: "border-cyan-400/20 bg-cyan-500/10 text-slate-100",
    iconClassName: "text-cyan-300",
  },
};

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => {
        const variant = variantStyles[toast.variant] || variantStyles.info;
        const Icon = variant.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-3xl border px-4 py-4 shadow-2xl shadow-black/20 backdrop-blur ${variant.cardClassName}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 ${variant.iconClassName}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-200/90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => onDismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutRefs = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description = "", variant = "info", duration = 3600 }) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, variant }]);

      if (duration > 0) {
        const timeoutId = window.setTimeout(() => {
          dismissToast(id);
        }, duration);
        timeoutRefs.current.set(id, timeoutId);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
