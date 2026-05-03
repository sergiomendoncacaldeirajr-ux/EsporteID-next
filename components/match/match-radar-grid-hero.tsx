"use client";

import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import type { MatchRadarFinalidade } from "@/lib/match/radar-snapshot";

export type MatchRadarGridHeroProps = {
  viewerId: string;
  finalidade: MatchRadarFinalidade;
  viewerDisponivelAmistoso: boolean;
  viewerAmistosoExpiresAt: string | null;
  /** Sincroniza com o estado interno do app (ex.: filtros / banners). */
  onAmistosoStateChange?: (nextOn: boolean) => void;
};

/** Hero do radar em modo grade — renderizado cedo na página para liberar o corpo em streaming. */
export function MatchRadarGridHero({
  viewerId,
  finalidade,
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
  onAmistosoStateChange,
}: MatchRadarGridHeroProps) {
  return (
    <header
      className={`eid-match-hero relative mb-3 mt-0 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
        aria-hidden
      />
      <div className="relative z-[1] grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 sm:gap-x-2.5">
        <span className="col-start-1 row-span-3 mt-0.5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] text-eid-primary-300 shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="7.5" />
            <circle cx="12" cy="12" r="2.1" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2" />
          </svg>
        </span>
        <div className="col-start-2 row-start-1 inline-flex min-w-0 max-w-full items-center gap-0.75 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
            aria-hidden
          />
          <span className="truncate">Radar de oponentes</span>
        </div>
        <div className="col-start-3 row-start-1 row-span-2 flex shrink-0 flex-col items-end gap-1.5 justify-self-end">
          <MatchLocationPrompt hasLocation />
          {finalidade !== "amistoso" ? (
            <MatchFriendlyToggle
              initialOn={viewerDisponivelAmistoso}
              initialExpiresAt={viewerAmistosoExpiresAt}
              userId={viewerId}
              onStateChange={onAmistosoStateChange}
            />
          ) : null}
        </div>
        <h1 className="col-start-2 row-start-2 pt-1 text-[1.4rem] font-black leading-none tracking-[-0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:pt-1.5 sm:text-[1.55rem]">
          Desafio
        </h1>
        <p className="col-start-2 col-span-2 row-start-3 max-w-none pt-0.5 text-[11px] leading-snug text-eid-text-secondary text-balance sm:text-[12px]">
          {finalidade === "amistoso"
            ? "Atletas com modo amistoso ativo e interesse em jogo casual. O botão Solicitar desafio já envia pedido amistoso (sem carência de meses)."
            : "Oponentes por proximidade; ordene por nota EID ou pontos do ranking. Troque modalidade e filtros sem recarregar."}
        </p>
      </div>
    </header>
  );
}
