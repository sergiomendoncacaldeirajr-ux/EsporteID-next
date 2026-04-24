"use client";

import {
  EID_LOGO_AUTH_MARK_HEIGHT,
  EID_LOGO_AUTH_MARK_SRC,
  EID_LOGO_AUTH_MARK_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
  /** Destaque na primeira dobra (LCP). */
  priority?: boolean;
};

/**
 * Marca pré-login (E multiesportes, PNG com alpha) — login, cadastro, onboarding, recuperar senha, etc.
 */
export function LogoFull({ className, priority }: Props) {
  return (
    <div className={className}>
      <img
        src={EID_LOGO_AUTH_MARK_SRC}
        alt="EsporteID"
        width={EID_LOGO_AUTH_MARK_WIDTH}
        height={EID_LOGO_AUTH_MARK_HEIGHT}
        className="mx-auto block h-auto w-full max-h-[min(30vw,132px)] max-w-[min(30vw,132px)] object-contain object-center sm:max-h-[150px] sm:max-w-[150px]"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
