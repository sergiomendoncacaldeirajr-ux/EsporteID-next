"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const hasQuery = new URLSearchParams(window.location.search).has("navdebug");
  let hasStorageFlag = false;
  try {
    hasStorageFlag = window.localStorage.getItem("eid:navdebug") === "1";
  } catch {
    hasStorageFlag = false;
  }
  return hasQuery || hasStorageFlag;
}

export function NavigationDebugProbe() {
  const pathname = usePathname();
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current = isEnabled();
    if (!enabledRef.current) return;
    console.log("[navdebug] probe enabled", {
      href: window.location.href,
      userAgent: navigator.userAgent,
    });

    const onPointerDown = (ev: PointerEvent) => {
      if (!enabledRef.current) return;
      const target = ev.target as Element | null;
      const link = target?.closest("a");
      console.log("[navdebug] pointerdown", {
        path: window.location.pathname + window.location.search,
        x: Math.round(ev.clientX),
        y: Math.round(ev.clientY),
        defaultPrevented: ev.defaultPrevented,
        target: target?.tagName ?? null,
        linkHref: link?.getAttribute("href") ?? null,
      });
    };

    const onClickCapture = (ev: MouseEvent) => {
      if (!enabledRef.current) return;
      const target = ev.target as Element | null;
      const link = target?.closest("a");
      console.log("[navdebug] click(capture)", {
        path: window.location.pathname + window.location.search,
        defaultPrevented: ev.defaultPrevented,
        button: ev.button,
        target: target?.tagName ?? null,
        linkHref: link?.getAttribute("href") ?? null,
      });
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("click", onClickCapture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("click", onClickCapture, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;
    console.log("[navdebug] pathname changed", {
      pathname,
      href: window.location.href,
      ts: Date.now(),
    });
  }, [pathname]);

  return null;
}
