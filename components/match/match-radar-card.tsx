"use client";

import Link from "next/link";
import type { MatchRadarCard, MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD, PROFILE_PUBLIC_AVATAR_RING_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EidNotaMetric, EidRankingPtsMetric } from "@/components/ui/eid-metrics";

type Props = {
  card: MatchRadarCard;
  esporteContextId: string;
  matchFinalidade: MatchRadarFinalidade;
};

function modalidadeLabel(m: MatchRadarCard["modalidade"]) {
  if (m === "individual") return "Individual";
  if (m === "dupla") return "Dupla";
  return "Time";
}

export function MatchRadarCardView({ card, esporteContextId, matchFinalidade }: Props) {
  const esporteParam = card.esporteId > 0 ? String(card.esporteId) : esporteContextId;
  const desafioHref = `/desafio?id=${encodeURIComponent(card.id)}&tipo=${encodeURIComponent(card.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(matchFinalidade)}`;

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const avatarSize = "h-[52px] w-[52px] sm:h-14 sm:w-14";

  return (
    <article
      className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} [content-visibility:auto] motion-safe:transition-[box-shadow] motion-safe:hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38),0_0_16px_-14px_rgba(37,99,235,0.35)]`}
    >
      <div className="flex gap-2.5 sm:gap-3">
        <div className="relative shrink-0 self-start">
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.nome}
              className={`${avatarSize} ${PROFILE_PUBLIC_AVATAR_RING_CLASS}`}
              loading="lazy"
            />
          ) : (
            <div
              className={`flex ${avatarSize} items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-xs font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-sm`}
            >
              {initials}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-eid-card shadow-sm ${
              card.disponivelAmistoso ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" : "bg-red-500"
            }`}
            title={card.disponivelAmistoso ? "Disponível para amistoso" : "Indisponível para amistoso"}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <div className="min-w-0">
              <h3 className="truncate text-[12px] font-black leading-tight tracking-tight text-eid-fg sm:text-[13px]">{card.nome}</h3>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-eid-primary-400">{card.esporteNome}</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <EidNotaMetric value={card.eid} size="sm" />
            <EidRankingPtsMetric value={card.rank} size="sm" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-eid-text-secondary">
            <span className="inline-flex items-center gap-0.5 font-medium text-eid-fg/85">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5 shrink-0 text-eid-action-500/90" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2 6a6 6 0 1 1 10.95 3.396l-3.535 5.142a1.5 1.5 0 0 1-2.83 0L2.95 9.396A5.972 5.972 0 0 1 2 6Zm6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="max-w-[10rem] truncate sm:max-w-[14rem]" title={card.localizacao}>
                {card.localizacao}
              </span>
            </span>
            <span className="text-[color:color-mix(in_srgb,var(--eid-border-subtle)_85%,transparent)]" aria-hidden>
              ·
            </span>
            <span className="font-semibold tabular-nums text-eid-primary-400/90">{card.dist.toFixed(1).replace(".", ",")} km</span>
            <span className="text-[color:color-mix(in_srgb,var(--eid-border-subtle)_85%,transparent)]" aria-hidden>
              ·
            </span>
            <span className="rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-eid-text-secondary">
              {modalidadeLabel(card.modalidade)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 border-t border-[color:var(--eid-border-subtle)]/65 pt-2.5">
        <div className="flex flex-wrap items-stretch gap-1.5">
          <Link
            href={desafioHref}
            className="eid-btn-match-cta inline-flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide sm:min-h-[38px] sm:text-[11px]"
          >
            {matchFinalidade === "amistoso" ? "Solicitar match amistoso" : "Solicitar match ranking"}
          </Link>
          <Link
            href={card.href}
            className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-[10px] font-semibold text-eid-text-secondary transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] hover:text-eid-primary-300 sm:min-h-[38px] sm:text-[11px]"
          >
            Perfil
          </Link>
        </div>
        {!card.canChallenge && card.challengeHint ? (
          <p className="text-[9px] leading-snug text-eid-text-secondary">{card.challengeHint}</p>
        ) : null}
      </div>
    </article>
  );
}
