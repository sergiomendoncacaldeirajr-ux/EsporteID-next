"use client";

import {
  EID_LOGO_AUTH_MARK_HEIGHT,
  EID_LOGO_AUTH_MARK_SRC,
  EID_LOGO_AUTH_MARK_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
};

/**
 * Marca pré-login (E multiesportes, PNG com alpha) — login, cadastro, onboarding, recuperar senha, etc.
 */
export function LogoFull({ className }: Props) {
  return (
    <div className={className}>
      {/* Painel suave: mascara “caixa” do PNG contra o gradiente do auth */}
      <div className="mx-auto flex w-fit max-w-full justify-center rounded-[1.75rem] bg-[color-mix(in_srgb,var(--eid-bg)_55%,transparent)] px-4 py-3 ring-1 ring-white/[0.04] backdrop-blur-[2px] [html[data-eid-theme=light]_&]:bg-[color-mix(in_srgb,var(--eid-card)_70%,transparent)] [html[data-eid-theme=light]_&]:ring-black/[0.06]">
        <img
          src={EID_LOGO_AUTH_MARK_SRC}
          alt="EsporteID"
          width={EID_LOGO_AUTH_MARK_WIDTH}
          height={EID_LOGO_AUTH_MARK_HEIGHT}
          className="block h-auto max-h-[min(28vw,120px)] w-auto max-w-[min(28vw,120px)] object-contain object-center sm:max-h-[138px] sm:max-w-[138px]"
          decoding="async"
        />
      </div>
    </div>
  );
}
