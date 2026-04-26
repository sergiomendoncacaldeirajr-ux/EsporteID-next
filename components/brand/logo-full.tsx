"use client";

import {
  EID_LOGO_AUTH_MARK_HEIGHT,
  EID_LOGO_AUTH_MARK_SRC,
  EID_LOGO_AUTH_MARK_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
  /** Tela de login/cadastro — marca um pouco maior. */
  size?: "default" | "auth" | "hero";
};

/**
 * Pré-login / onboarding / landing — usa o ícone oficial com fundo transparente.
 */
export function LogoFull({ className, size = "default" }: Props) {
  const markClass =
    size === "hero"
      ? "h-28 max-h-32 w-auto max-w-[min(88vw,360px)] sm:h-32 sm:max-h-[8rem] sm:max-w-[min(88vw,420px)] lg:h-36 lg:max-h-[9rem] lg:max-w-[min(88vw,460px)]"
      : size === "auth"
        ? "h-24 max-h-[6.5rem] w-auto max-w-[min(88vw,360px)] sm:h-28 sm:max-h-[7.25rem] sm:max-w-[min(88vw,420px)]"
        : "h-20 max-h-24 w-auto max-w-[min(84vw,300px)] sm:h-24 sm:max-h-28 sm:max-w-[min(84vw,340px)]";
  return (
    <div className={`flex w-full justify-center ${className ?? ""}`}>
      <img
        src={EID_LOGO_AUTH_MARK_SRC}
        alt="EsporteID"
        width={EID_LOGO_AUTH_MARK_WIDTH}
        height={EID_LOGO_AUTH_MARK_HEIGHT}
        className={`object-contain ${markClass}`}
        decoding="async"
      />
    </div>
  );
}
