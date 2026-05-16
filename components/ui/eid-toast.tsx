"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  error: <XCircle className="h-4 w-4 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
  info: <Info className="h-4 w-4 shrink-0" />,
};

const COLORS: Record<ToastKind, string> = {
  success: "border-emerald-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,#10b981_14%,var(--eid-card)),var(--eid-card))] text-emerald-300 eid-light:border-emerald-500/40 eid-light:bg-emerald-50 eid-light:text-emerald-700",
  error:   "border-rose-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,#f43f5e_14%,var(--eid-card)),var(--eid-card))] text-rose-300 eid-light:border-rose-500/40 eid-light:bg-rose-50 eid-light:text-rose-700",
  warning: "border-amber-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,#f59e0b_14%,var(--eid-card)),var(--eid-card))] text-amber-300 eid-light:border-amber-500/40 eid-light:bg-amber-50 eid-light:text-amber-700",
  info:    "border-eid-primary-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)),var(--eid-card))] text-eid-primary-300 eid-light:border-eid-primary-500/40 eid-light:bg-blue-50 eid-light:text-eid-primary-700",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Trigger entrance animation
    requestAnimationFrame(() => el.setAttribute("data-visible", "1"));
    const timer = setTimeout(() => {
      el.removeAttribute("data-visible");
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="polite"
      className={`eid-toast-item pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-3.5 py-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md ${COLORS[toast.kind]}`}
    >
      {ICONS[toast.kind]}
      <p className="min-w-0 flex-1 text-[12px] font-bold leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-full p-0.5 opacity-60 transition hover:opacity-100"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function EidToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--eid-shell-content-bottom-pad,72px)+8px)] z-[9999] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside EidToastProvider");
  return ctx;
}

/** Trigger a toast from anywhere without React context (fires a custom event). */
export function fireToast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("eid:toast", { detail: { message, kind } }));
}
