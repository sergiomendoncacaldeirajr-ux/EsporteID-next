"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EID_PWA_BACKGROUND, EID_PWA_SPLASH_MARK_SRC } from "@/lib/branding";

const PWA_SPLASH_SEEN_SESSION_KEY = "eid_pwa_splash_seen_v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaLaunchSplash() {
  const isStandaloneMode = isStandalone();
  const shouldShow =
    isStandaloneMode &&
    (() => {
      if (typeof window === "undefined") return false;
      try {
        return window.sessionStorage.getItem(PWA_SPLASH_SEEN_SESSION_KEY) !== "1";
      } catch {
        return true;
      }
    })();
  const [visible, setVisible] = useState(shouldShow);
  const [mounted, setMounted] = useState(!shouldShow);

  useEffect(() => {
    if (!shouldShow) {
      return;
    }
    try {
      window.sessionStorage.setItem(PWA_SPLASH_SEEN_SESSION_KEY, "1");
    } catch {
      // ignore sessionStorage failures
    }
    const hideTimer = window.setTimeout(() => setVisible(false), 900);
    const unmountTimer = window.setTimeout(() => setMounted(true), 1200);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [shouldShow]);

  if (mounted || !visible) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: EID_PWA_BACKGROUND }}
    >
      <div className="relative aspect-square w-[56vw] max-w-[300px]">
        <Image
          src={EID_PWA_SPLASH_MARK_SRC}
          alt=""
          fill
          unoptimized
          className="object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        />
      </div>
    </div>
  );
}
