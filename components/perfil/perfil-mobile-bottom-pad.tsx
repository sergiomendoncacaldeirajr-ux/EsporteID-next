"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Rota pública do atleta na raiz: `/perfil/[id]` — exclui `/perfil/.../historico`, `/eid/`, etc. */
function isPerfilPublicoRaiz(pathname: string): boolean {
  const p = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return /^\/perfil\/[^/]+$/.test(p);
}

function measureBottomChromePx(): number {
  const shell = document.getElementById("eid-mobile-bottom-nav");
  if (!shell) return 0;
  const rect = shell.getBoundingClientRect();
  const vv = window.visualViewport;
  const bottomEdge = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight);
  let topEdge = rect.top;
  const rank = shell.querySelector('[aria-label="Rank"]');
  if (rank) {
    const rr = rank.getBoundingClientRect();
    topEdge = Math.min(topEdge, rr.top);
  }
  const raw = bottomEdge - topEdge;
  return Math.max(Math.ceil(raw + 20), 96);
}

/**
 * Garante folga rolável na coluna principal no perfil público: em alguns Android/iOS o
 * `padding-bottom` do `body` / variáveis CSS não “empurram” o conteúdo acima da nav fixa.
 */
export function PerfilMobileBottomPad() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const col = document.getElementById("app-main-column");
    if (!col) return;

    const mq = window.matchMedia("(min-width: 768px)");
    const active = isPerfilPublicoRaiz(pathname);

    const apply = () => {
      if (!active || mq.matches || !document.body.classList.contains("eid-app-shell")) {
        col.style.removeProperty("padding-bottom");
        return;
      }
      col.style.paddingBottom = `${measureBottomChromePx()}px`;
    };

    apply();
    const shell = document.getElementById("eid-mobile-bottom-nav");
    const ro = new ResizeObserver(apply);
    if (shell) ro.observe(shell);
    mq.addEventListener("change", apply);
    window.addEventListener("orientationchange", apply);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    const t0 = window.setTimeout(apply, 0);
    const t1 = window.setTimeout(apply, 200);
    const t2 = window.setTimeout(apply, 600);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      col.style.removeProperty("padding-bottom");
    };
  }, [pathname]);

  return null;
}
