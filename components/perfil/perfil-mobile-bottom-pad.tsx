"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Só a raiz `/perfil/[id]` — não histórico, eid, etc. */
function isPerfilPublicoRaiz(pathname: string): boolean {
  const p = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return /^\/perfil\/[^/]+$/.test(p);
}

/** Mesma base que `MobileBottomNav` (`--eid-shell-footer-offset-measured`), + folga extra no perfil. */
function bottomBarClearancePx(): number {
  const shell = document.getElementById("eid-mobile-bottom-nav");
  if (!shell) return 120;
  const vv = window.visualViewport;
  const vh = vv?.height ?? window.innerHeight;
  const vTop = vv?.offsetTop ?? 0;
  const bottomEdge = vTop + vh;
  const rect = shell.getBoundingClientRect();
  let inset = Math.max(0, bottomEdge - rect.top);
  if (rect.height < 36) {
    inset = Math.max(inset, 96);
  }
  /* Nav usa +14 no body; aqui +22 dá respiro a mais para capa/CTA acima da barra fixa. */
  return Math.max(Math.ceil(inset + 22), 104);
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
    vv?.addEventListener("scroll", apply);
    const t0 = window.setTimeout(apply, 0);
    const t1 = window.setTimeout(apply, 160);
    const t2 = window.setTimeout(apply, 520);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("resize", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      main.style.removeProperty("margin-bottom");
    };
  }, [pathname]);

  return null;
}
