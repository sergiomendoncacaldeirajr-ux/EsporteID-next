"use client";

import { useLayoutEffect, useState } from "react";
import { applyEidTheme } from "@/components/eid-theme-hydration";

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="currentColor"
        d="M9.37 5.51c-.09.71-.14 1.43-.14 2.14 0 5.3 3.7 9.75 8.66 10.88-.59.21-1.21.32-1.84.32-5.52 0-10-4.48-10-10 0-1.18.2-2.32.59-3.38 1.55 1.21 3.43 2.04 5.32 2.04z"
      />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="currentColor"
        d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2v2zm18 0h2v-2h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2h-2zm0 18v2h2v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.64 5.64L4.22 4.22 2.81 5.64l1.41 1.41 1.42-1.41zM18.36 18.36l1.41 1.41 1.42-1.41-1.41-1.41-1.42 1.41zM4.22 19.78l1.41 1.42 1.42-1.42-1.41-1.41-1.42 1.41zM19.78 4.22l-1.41-1.41-1.42 1.41 1.41 1.41 1.42-1.41z"
      />
    </svg>
  );
}

type Props = {
  className?: string;
  /** Quadrado compacto para cabeçalho (ícone só). */
  variant?: "default" | "toolbar";
};

/**
 * Alterna tema claro/escuro em todo o site (`data-eid-theme` + localStorage).
 */
export function EidThemeToggle({ className, variant = "default" }: Props) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.dataset.eidTheme === "light" ? "light" : "dark";
  });

  useLayoutEffect(() => {
    const t = document.documentElement.dataset.eidTheme === "light" ? "light" : "dark";
    setTheme(t);
  }, []);

  function toggle() {
    /** Sempre ler do DOM: evita 1º toque “morto” quando o estado React ficou dessincronizado (ex.: iframe / hidratação). */
    const dom =
      typeof document !== "undefined" && document.documentElement.dataset.eidTheme === "light" ? "light" : "dark";
    const next = dom === "light" ? "dark" : "light";
    setTheme(next);
    applyEidTheme(next);
  }

  const isLight = theme === "light";

  const toolbarCls =
    variant === "toolbar"
      ? "eid-btn-ghost inline-flex h-9 w-9 shrink-0 rounded-xl p-0 text-eid-text-muted hover:text-eid-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/50 [touch-action:manipulation]"
      : "inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-3 text-eid-text-muted shadow-sm backdrop-blur-sm transition hover:border-eid-primary-500/30 hover:text-eid-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/50 [touch-action:manipulation]";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${toolbarCls} ${className ?? ""}`}
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      aria-pressed={isLight}
    >
      {isLight ? <IconSun className="text-eid-action-500" /> : <IconMoon className="text-eid-primary-300" />}
      {variant === "default" ? (
        <span className="hidden text-xs font-semibold sm:inline">{isLight ? "Claro" : "Escuro"}</span>
      ) : null}
    </button>
  );
}
