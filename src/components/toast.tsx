"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckIcon, CloseIcon } from "./icons";

type Toast = { id: number; message: string; tone: "default" | "error" };

const ToastContext = createContext<{ push: (message: string, tone?: Toast["tone"]) => void }>({
  push: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: Toast["tone"] = "default") => {
      const id = Date.now() + Math.random();
      setToasts((items) => [...items.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === "error" ? "toast--error" : ""}`}>
            <span className="toast__icon">
              {toast.tone === "error" ? <CloseIcon /> : <CheckIcon />}
            </span>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="关闭提示">
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
