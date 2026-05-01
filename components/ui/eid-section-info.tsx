"use client";

import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Título da seção (acessibilidade). */
  sectionLabel: string;
  /** Texto ou conteúdo explicativo. */
  children: React.ReactNode;
  className?: string;
};

/**
 * Ícone (i) ao lado de títulos de seção: ao toque/clique abre caixa com explicação.
 * Use junto de `ProfileSection` (`info`) ou importe onde precisar.
 */
export function EidSectionInfo({ sectionLabel, children, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const maxW = Math.min(288, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - maxW - 8);
    setPos({ top: r.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const t = window.setTimeout(updatePos, 10);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center text-eid-text-secondary transition hover:text-eid-primary-500 ${className}`.trim()}
        aria-label={`O que é: ${sectionLabel}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
      </button>
      {open && mounted
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Fechar explicação"
                className="fixed inset-0 z-[240] cursor-default bg-transparent"
                onClick={() => setOpen(false)}
              />
              <div
                id={panelId}
                role="dialog"
                aria-label={`Sobre ${sectionLabel}`}
                className="fixed z-[241] w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2.5 shadow-[0_12px_28px_-16px_rgba(15,23,42,0.45)]"
                style={{ top: pos.top, left: pos.left }}
              >
                <div className="text-[11px] leading-relaxed text-eid-fg">{children}</div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
