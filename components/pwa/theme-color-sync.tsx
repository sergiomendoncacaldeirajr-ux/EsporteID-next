"use client";

import { useLayoutEffect } from "react";
import { EID_SYSTEM_UI_THEME_COLOR_DARK, EID_SYSTEM_UI_THEME_COLOR_LIGHT } from "@/lib/branding";

/**
 * `--eid-system-ui-chrome` acompanha o tom do topo do header (não o canvas `--eid-bg`).
 * Resolve via `getComputedStyle` para exportar `rgb()`/`rgba()` aceito em `meta theme-color`.
 */
function themeColorForHtml(): string {
  let probe = document.getElementById("eid-system-ui-chrome-probe") as HTMLDivElement | null;
  if (!probe) {
    probe = document.createElement("div");
    probe.id = "eid-system-ui-chrome-probe";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);background-color:var(--eid-system-ui-chrome)";
    document.body.appendChild(probe);
  }
  const rgb = getComputedStyle(probe).backgroundColor;
  if (rgb && rgb !== "transparent" && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(rgb)) {
    return rgb;
  }
  const t = document.documentElement.getAttribute("data-eid-theme");
  return t === "light" ? EID_SYSTEM_UI_THEME_COLOR_LIGHT : EID_SYSTEM_UI_THEME_COLOR_DARK;
}

function applyThemeColorMeta() {
  const color = themeColorForHtml();
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    m.content = color;
    document.head.appendChild(m);
    return;
  }
  metas.forEach((m) => {
    m.content = color;
  });
}

/**
 * iOS PWA / Safari standalone: `black-translucent` = texto claro na status bar (ok no escuro);
 * no tema claro com header branco use `default` (ícones escuros), senão a barra parece “do sistema errada”.
 */
function applyAppleStatusBarStyleMeta() {
  const theme = document.documentElement.getAttribute("data-eid-theme");
  const content = theme === "light" ? "default" : "black-translucent";
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "apple-mobile-web-app-status-bar-style";
    m.content = content;
    document.head.appendChild(m);
    return;
  }
  metas.forEach((m) => {
    m.content = content;
  });
}

function applyChromeFromTheme() {
  applyThemeColorMeta();
  applyAppleStatusBarStyleMeta();
}

/**
 * Android / Chrome: `theme-color` precisa bater com o tema real (`data-eid-theme`),
 * não só com `prefers-color-scheme` do sistema.
 * iOS: mesma troca + `apple-mobile-web-app-status-bar-style` (via `useLayoutEffect`, após `EidThemeHydration`).
 */
export function ThemeColorSync() {
  useLayoutEffect(() => {
    applyChromeFromTheme();
    const obs = new MutationObserver(() => applyChromeFromTheme());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });
    return () => obs.disconnect();
  }, []);

  return null;
}
