"use client";

import { useEffect } from "react";
import { EID_APP_CHROME_THEME_COLOR, EID_LIGHT_APP_SURFACE } from "@/lib/branding";

function themeColorForHtml() {
  const t = document.documentElement.getAttribute("data-eid-theme");
  return t === "light" ? EID_LIGHT_APP_SURFACE : EID_APP_CHROME_THEME_COLOR;
}

function applyThemeColorMeta() {
  const color = themeColorForHtml();
  const ownSelector = 'meta[name="theme-color"][data-eid-theme-color="1"]';
  let m = document.querySelector(ownSelector) as HTMLMetaElement | null;
  if (!m) {
    m = document.createElement("meta");
    m.name = "theme-color";
    m.setAttribute("data-eid-theme-color", "1");
    document.head.appendChild(m);
  }
  m.content = color;
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
