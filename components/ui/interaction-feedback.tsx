"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function isAuthPath(pathname: string | null): boolean {
  const p = pathname ?? "";
  return (
    p === "/login" ||
    p === "/cadastro" ||
    p === "/recuperar-senha" ||
    p === "/redefinir-senha" ||
    p === "/verificar-codigo" ||
    p.startsWith("/auth/")
  );
}

/**
 * Scroll estável em auth/onboarding (sem listener global de clique — isso exigia 2 toques no Android/iOS).
 */
export function InteractionFeedback() {
  const pathname = usePathname();
  const authPath = isAuthPath(pathname);
  const isOnboarding = (pathname ?? "").startsWith("/onboarding");
  const isAuthOrOnboarding = authPath || isOnboarding;

  useEffect(() => {
    if (!isAuthOrOnboarding) return;
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const main = document.getElementById("app-main-column");
    if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const raf = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
      root.style.scrollBehavior = prevBehavior;
    });
    return () => {
      window.cancelAnimationFrame(raf);
      root.style.scrollBehavior = prevBehavior;
    };
  }, [pathname, isAuthOrOnboarding]);

  return null;
}
