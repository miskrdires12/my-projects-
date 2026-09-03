"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: "success" | "error" | "info", title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, description?: string) => addToast("success", title, description),
    error: (title: string, description?: string) => addToast("error", title, description),
    info: (title: string, description?: string) => addToast("info", title, description),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Floating Toast Notification Container (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950 text-white shadow-2xl border border-neutral-800 animate-in slide-in-from-bottom-5 duration-200"
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="text-xs font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-[11px] text-neutral-400 leading-snug">{t.description}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-500 hover:text-white transition-colors p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}
