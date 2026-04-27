"use client";

import { useCallback, useLayoutEffect, useState, type ReactNode } from "react";

const LS_PREFIX = "eid:dismissible-intro:v1:";

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dismissedToday(storageKey: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LS_PREFIX + storageKey) === ymdLocal();
  } catch {
    return false;
  }
}

type Props = {
  /** Chave estável e única (ex.: `dashboard:atletas-proximos`). */
  storageKey: string;
  className?: string;
  children: ReactNode;
};

/**
 * Caixa de texto logo abaixo do cabeçalho de seção: some ao tocar em qualquer ponto
 * e só volta no dia seguinte (fuso do navegador).
 */
export function DismissibleSectionIntro({ storageKey, className, children }: Props) {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if (dismissedToday(storageKey)) setVisible(false);
  }, [storageKey]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(LS_PREFIX + storageKey, ymdLocal());
    } catch {
      /* modo privado / quota */
    }
    setVisible(false);
  }, [storageKey]);

  if (!visible) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismiss();
        }
      }}
      className={[
        className,
        "cursor-pointer select-none outline-none transition hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_7%,var(--eid-surface)_93%)] focus-visible:ring-2 focus-visible:ring-eid-primary-500/40 active:scale-[0.995]",
      ]
        .filter(Boolean)
        .join(" ")}
      title="Ocultar este aviso até amanhã"
      aria-label="Ocultar este aviso até amanhã"
    >
      {children}
    </div>
  );
}
