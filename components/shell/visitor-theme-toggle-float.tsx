"use client";

import { usePathname } from "next/navigation";
import { EidThemeToggle } from "@/components/eid-theme-toggle";

function shouldShowFloatingTheme(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar-senha" ||
    pathname === "/redefinir-senha" ||
    pathname === "/verificar-codigo" ||
    pathname === "/privacidade" ||
    pathname === "/termos"
  );
}

export function VisitorThemeToggleFloat() {
  const pathname = usePathname() ?? "";
  if (!shouldShowFloatingTheme(pathname)) return null;

  return (
    <div className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] sm:right-4">
      <EidThemeToggle />
    </div>
  );
}
