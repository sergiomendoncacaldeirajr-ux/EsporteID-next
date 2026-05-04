"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Só a raiz `/perfil/[id]` — não histórico, eid, etc. */
function isPerfilPublicoRaiz(pathname: string): boolean {
  const p = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return /^\/perfil\/[^/]+$/.test(p);
}

/** Altura da faixa fixa inferior (nav do app) até o fim da viewport, em px. */
function bottomBarClearancePx(): number {
  const shell = document.getElementById("eid-mobile-bottom-nav");
  if (!shell) return 120;
  const rect = shell.getBoundingClientRect();
  return Math.max(Math.ceil(window.innerHeight - rect.top + 20), 104);
}

/**
 * Folga **só no perfil público**: usa `margin-bottom` no próprio `<main id="perfil-public-main">`.
 * `padding-bottom` no `#app-main-column` não resolve — com `flex-1`/`min-h-0` o padding come espaço
 * interno e o conteúdo continua por baixo da barra fixa.
 */
export function PerfilMobileBottomPad() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const main = document.getElementById("perfil-public-main");
    if (!main) return;

    const mq = window.matchMedia("(min-width: 768px)");
    const active = isPerfilPublicoRaiz(pathname);

    const apply = () => {
      if (!active || mq.matches || !document.body.classList.contains("eid-app-shell")) {
        main.style.removeProperty("margin-bottom");
        return;
      }
      main.style.marginBottom = `${bottomBarClearancePx()}px`;
    };

    apply();
    const shell = document.getElementById("eid-mobile-bottom-nav");
    const ro = new ResizeObserver(apply);
    if (shell) ro.observe(shell);
    mq.addEventListener("change", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("resize", apply);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    const t0 = window.setTimeout(apply, 0);
    const t1 = window.setTimeout(apply, 250);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("resize", apply);
      vv?.removeEventListener("resize", apply);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      main.style.removeProperty("margin-bottom");
    };
  }, [pathname]);

  return null;
}
