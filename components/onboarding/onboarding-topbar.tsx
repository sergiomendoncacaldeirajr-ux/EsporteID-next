"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { EidThemeToggle } from "@/components/eid-theme-toggle";

/**
 * Barra superior só para `/onboarding`: marca + tema + sair (sem navegação do app).
 */
export function OnboardingTopbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/90 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-eid-bg/82">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1 overflow-hidden">
          <LogoWordmark priority className="h-7 max-w-[min(44vw,160px)] sm:h-9 sm:max-w-[200px]" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EidThemeToggle variant="toolbar" className="h-9 w-9" />
          <SignOutButton variant="icon" />
        </div>
      </div>
    </header>
  );
}
