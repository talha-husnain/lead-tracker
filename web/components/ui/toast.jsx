"use client";
import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(() => {});

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((msg, action) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, action }]);
    setTimeout(() => remove(id), action ? 6000 : 3200);
  }, [remove]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
          >
            <span>{t.msg}</span>
            {t.action && (
              <button
                className="rounded border border-background/40 px-2 py-0.5 text-xs font-semibold hover:bg-background/10"
                onClick={() => { remove(t.id); t.action.onClick(); }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
