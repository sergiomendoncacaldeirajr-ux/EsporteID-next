"use client";

import { useEffect } from "react";

/**
 * A bottom bar do app fica oculta em /admin; reduz o padding inferior reservado no layout raiz.
 */
export function AdminMainPadReset() {
  useEffect(() => {
    const el = document.getElementById("app-main-column");
    if (!el) return;
    const prev = el.style.paddingBottom;
    el.style.paddingBottom = "max(1rem, env(safe-area-inset-bottom))";
    return () => {
      el.style.paddingBottom = prev;
    };
  }, []);
  return null;
}
