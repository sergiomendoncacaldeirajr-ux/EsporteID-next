"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type RulesDismissModalProps = {
  permanentHideStorageKey: string;
  title: string;
  children: React.ReactNode;
  /** z-index acima do shell/footer quando necessário */
  overlayClassName?: string;
};

export function RulesDismissModal({
  permanentHideStorageKey,
  title,
  children,
  overlayClassName = "z-[810]",
}: RulesDismissModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (window.localStorage.getItem(permanentHideStorageKey) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [mounted, permanentHideStorageKey]);

  const close = useCallback(() => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(permanentHideStorageKey, "1");
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
  }, [dontShowAgain, permanentHideStorageKey]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`fixed inset-0 flex items-center justify-center bg-black/60 px-3 ${overlayClassName}`}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={close}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div className="pointer-events-auto relative z-[1] w-full max-w-md rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-3 shadow-[0_18px_44px_-24px_rgba(2,6,23,0.78)] sm:p-4">
        <button
          type="button"
          aria-label="Fechar"
          onClick={close}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p id={titleId} className="pr-11 text-sm font-black text-eid-fg">
          {title}
        </p>
        <div className="mt-2">{children}</div>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-eid-text-secondary sm:text-xs">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[color:var(--eid-border-subtle)]"
          />
          <span>Não mostrar novamente</span>
        </label>
      </div>
    </div>,
    document.body
  );
}
