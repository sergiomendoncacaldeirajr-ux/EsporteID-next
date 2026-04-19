"use client";

import {
  EID_LOGO_FULL_HEIGHT,
  EID_LOGO_FULL_SRC,
  EID_LOGO_FULL_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
  /** Destaque na primeira dobra (LCP). */
  priority?: boolean;
};

/**
 * Logo completa (E multiesportes + ESPORTEID) — pré-dashboard, auth, onboarding.
 */
export function LogoFull({ className, priority }: Props) {
  return (
    <div className={className}>
      <img
        src={EID_LOGO_FULL_SRC}
        alt="EsporteID"
        width={EID_LOGO_FULL_WIDTH}
        height={EID_LOGO_FULL_HEIGHT}
        className="mx-auto block h-auto w-full max-h-[min(22vw,104px)] max-w-[min(78vw,200px)] sm:max-h-[120px] sm:max-w-[220px] object-contain object-center"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
