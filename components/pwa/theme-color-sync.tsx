"use client";

import { useEffect } from "react";
import { EID_APP_CHROME_THEME_COLOR, EID_LIGHT_APP_SURFACE } from "@/lib/branding";

function themeColorForHtml() {
  const t = document.documentElement.getAttribute("data-eid-theme");
  return t === "light" ? EID_LIGHT_APP_SURFACE : EID_APP_CHROME_THEME_COLOR;
}

function applyThemeColorMeta() {
  const color = themeColorForHtml();
  document.querySelectorAll('meta[name="theme-color"]').forEach((n) => n.remove());
  const m = document.createElement("meta");
  m.name = "theme-color";
  m.content = color;
  document.head.appendChild(m);
}

/**
 * Android / Chrome: `theme-color` precisa bater com o tema real (`data-eid-theme`),
 * não só com `prefers-color-scheme` do sistema.
 */
export function ThemeColorSync() {
  useEffect(() => {
    applyThemeColorMeta();
    const obs = new MutationObserver(() => applyThemeColorMeta());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });
    return () => obs.disconnect();
  }, []);

  return null;
}
