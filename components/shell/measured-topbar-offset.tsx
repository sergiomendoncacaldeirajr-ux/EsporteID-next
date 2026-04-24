"use client";

import { useLayoutEffect } from "react";

/**
 * O header é `position: fixed` e não empurra o fluxo; o padding-top do body usa uma estimativa em rem
 * que no iPhone costuma ficar menor que a altura real (safe area + busca + escala). Medimos o topbar
 * e gravamos em `--eid-measured-topbar-height` para o conteúdo (ex.: “Voltar”) não nascer sob o relógio.
 */
export function MeasuredTopbarOffset() {
  useLayoutEffect(() => {
    const el = document.getElementById("eid-persistent-topbar");
    if (!el) return;

    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty("--eid-measured-topbar-height", `${h}px`);
      }
    };

    apply();
    requestAnimationFrame(apply);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("orientationchange", apply);
    window.visualViewport?.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--eid-measured-topbar-height");
    };
  }, []);

  return null;
}
