"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * PWA / iOS WebKit: `position: fixed; bottom: 0` na barra inferior pode ficar
 * deslocada em relação à borda **visual** após navegação ou mudança de chrome.
 * Alinha com `VisualViewport` (resize + scroll) sem tocar no scroll da window.
 */
export function VisualViewportBottomNavSync() {
  const pathname = usePathname();

  useEffect(() => {
    const nav = document.getElementById("eid-mobile-bottom-nav");
    const vv = window.visualViewport;
    if (!nav || !vv) return;

    let raf = 0;

    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!window.matchMedia("(max-width: 767px)").matches) {
          nav.style.bottom = "";
          return;
        }
        const rect = nav.getBoundingClientRect();
        const visibleBottom = vv.offsetTop + vv.height;
        const gap = visibleBottom - rect.bottom;
        if (Math.abs(gap) > 2) {
          nav.style.bottom = `${-Math.round(gap)}px`;
        } else {
          nav.style.bottom = "";
        }
      });
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);

    const t1 = window.setTimeout(sync, 120);
    const t2 = window.setTimeout(sync, 450);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      nav.style.bottom = "";
    };
  }, [pathname]);

  return null;
}
