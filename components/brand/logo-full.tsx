"use client";

import { LogoWordmark } from "@/components/brand/logo-wordmark";

type Props = {
  className?: string;
  /** Tela de login/cadastro — marca um pouco maior. */
  size?: "default" | "auth";
};

/**
 * Pré-login / onboarding / landing — mesma arte do header interno (`LogoWordmark`, PNG transparente).
 */
export function LogoFull({ className, size = "default" }: Props) {
  const markClass =
    size === "auth"
      ? "h-12 max-h-[3.25rem] max-w-[min(92vw,380px)] sm:h-16 sm:max-h-[4.25rem] sm:max-w-[min(92vw,460px)]"
      : "h-10 max-h-11 max-w-[min(88vw,340px)] sm:h-12 sm:max-h-[52px] sm:max-w-[min(88vw,380px)]";
  return (
    <div className={`flex w-full justify-center ${className ?? ""}`}>
      <LogoWordmark objectPosition="center" className={markClass} />
    </div>
  );
}
