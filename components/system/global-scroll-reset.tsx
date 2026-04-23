"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function forceTop() {
  const main = document.getElementById("app-main-column");
  if (main) main.scrollTop = 0;

  /*
   * Shell mobile: o scroll real fica em #app-main-column (overflow-y-auto).
   * Chamar window.scrollTo no iOS Safari altera o layout viewport / barra de URL
   * e “puxa” position:fixed (ex.: nav inferior) para cima após cada navegação.
   */
  const shellMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches &&
    main?.getAttribute("data-eid-app-scroll-root") === "1";
  if (shellMobile) return;

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
}

export function GlobalScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    forceTop();
    const raf = window.requestAnimationFrame(() => forceTop());
    const timer = window.setTimeout(() => forceTop(), 80);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    const onPageShow = () => forceTop();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}

