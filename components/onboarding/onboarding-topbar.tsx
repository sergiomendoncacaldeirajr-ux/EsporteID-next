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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-3 py-2 sm:px-6">
        <div className="min-w-0 shrink-0">
          <LogoWordmark className="h-8 max-w-[min(48vw,200px)] sm:h-9" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <EidThemeToggle variant="toolbar" />
          <SignOutButton variant="icon" />
        </div>
      </div>
    </header>
  );
}
