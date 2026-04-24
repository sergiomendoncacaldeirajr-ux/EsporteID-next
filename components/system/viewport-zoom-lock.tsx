"use client";

import { useEffect } from "react";

/** Reforça meta viewport (aba no navegador) e reduz zoom por atalho/trackpad no desktop. */
const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

export function ViewportZoomLock() {
  useEffect(() => {
    const syncViewportMeta = () => {
      let el = document.querySelector('meta[name="viewport"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "viewport");
        document.head.prepend(el);
      }
      el.setAttribute("content", VIEWPORT_CONTENT);
    };
    syncViewportMeta();

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const blockGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("wheel", onWheel, { passive: false });
    /* Safari (WebKit): pinch no documento */
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
    };
  }, []);

  return null;
}
