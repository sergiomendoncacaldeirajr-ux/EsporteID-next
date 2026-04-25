"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function forceTop() {
  const main = document.getElementById("app-main-column");
  if (main) main.scrollTop = 0;

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
}

/**
 * Só `usePathname` aqui — `useSearchParams` no layout raiz **sem** `<Suspense>` quebra
 * navegação client (URL muda, conteúdo só no 2º clique). Ver Next.js: static rendering bailout.
 *
 * O scroll para o topo roda após o próximo paint (duplo rAF + timeout curto), para não
 * competir com o commit da nova rota no App Router.
 */
export function GlobalScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    let rafInner = 0;
    /* No browser `window.setTimeout` retorna `number`; com @types/node vira conflito com `NodeJS.Timeout`. */
    let timeoutId: number | undefined;

    const rafOuter = window.requestAnimationFrame(() => {
      rafInner = window.requestAnimationFrame(() => {
        if (cancelled) return;
        forceTop();
        timeoutId = window.setTimeout(() => {
          if (!cancelled) forceTop();
        }, 32);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafOuter);
      window.cancelAnimationFrame(rafInner);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    const onPageShow = () => forceTop();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
