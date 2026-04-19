"use client";

import { useLayoutEffect } from "react";

/** Sincroniza `data-eid-theme` no `<html>` com `localStorage` (evita flash após hidratação). */
export function EidThemeHydration() {
  useLayoutEffect(() => {
    const t = localStorage.getItem("theme");
    document.documentElement.dataset.eidTheme = t === "light" ? "light" : "dark";
  }, []);
  return null;
}

/** Atualiza tema no documento e no armazenamento local (login/cadastro). */
export function applyEidTheme(theme: "dark" | "light") {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.eidTheme = theme;
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* ignore */
  }
}
