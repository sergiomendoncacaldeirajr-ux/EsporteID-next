"use client";

import { LogoWordmark } from "@/components/brand/logo-wordmark";

type Props = {
  className?: string;
};

/**
 * Pré-login / onboarding / landing — mesma arte do header interno (`LogoWordmark`, PNG transparente).
 */
export function LogoFull({ className }: Props) {
  return (
    <div className={`flex w-full justify-center ${className ?? ""}`}>
      <LogoWordmark
        objectPosition="center"
        className="h-10 max-h-11 max-w-[min(88vw,340px)] sm:h-12 sm:max-h-[52px] sm:max-w-[min(88vw,380px)]"
      />
    </div>
  );
}
