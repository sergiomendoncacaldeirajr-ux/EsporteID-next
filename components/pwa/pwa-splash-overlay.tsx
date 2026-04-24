"use client";

import { useEffect, useState } from "react";
import { EID_PWA_SPLASH_MARK_SRC, EID_PWA_BACKGROUND } from "@/lib/branding";

function isPwaDisplayMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Marca do ícone (transparente) sobre fundo marca — abertura PWA iOS/Android. */
export function PwaSplashOverlay() {
  const [phase, setPhase] = useState<"gone" | "in" | "out">("gone");

  useEffect(() => {
    if (!isPwaDisplayMode()) return;
    setPhase("in");
    const tOut = window.setTimeout(() => setPhase("out"), 720);
    const tGone = window.setTimeout(() => setPhase("gone"), 1350);
    return () => {
      window.clearTimeout(tOut);
      window.clearTimeout(tGone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-500 ease-out ${
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: EID_PWA_BACKGROUND }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- splash imediata; evita flash do optimizer */}
      <img
        src={EID_PWA_SPLASH_MARK_SRC}
        alt=""
        className="h-28 w-28 max-h-[7.5rem] max-w-[7.5rem] object-contain"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
