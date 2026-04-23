"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import type { MatchRadarCard, MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { PROFILE_CARD_BASE, PROFILE_PUBLIC_AVATAR_RING_CLASS } from "@/components/perfil/profile-ui-tokens";

type Props = {
  card: MatchRadarCard;
  esporteContextId: string;
  matchFinalidade: MatchRadarFinalidade;
};

export function MatchRadarCardView({ card, esporteContextId, matchFinalidade }: Props) {
  const esporteParam = card.esporteId > 0 ? String(card.esporteId) : esporteContextId;
  const desafioHref = `/desafio?id=${encodeURIComponent(card.id)}&tipo=${encodeURIComponent(card.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(matchFinalidade)}`;

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const avatarSize = "h-[48px] w-[48px] sm:h-[52px] sm:w-[52px]";

  return (
    <article
      className={`${PROFILE_CARD_BASE} p-2 [content-visibility:auto] motion-safe:transition-[box-shadow] motion-safe:hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38),0_0_16px_-14px_rgba(37,99,235,0.35)] sm:p-2.5`}
    >
      <div className="flex gap-2 sm:gap-2.5">
        <div className={`relative shrink-0 self-start ${avatarSize}`}>
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.nome}
              className={`h-full w-full ${PROFILE_PUBLIC_AVATAR_RING_CLASS}`}
              loading="lazy"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-[11px] font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-xs`}
            >
              {initials}
            </div>
          )}
          <div className="pointer-events-none absolute -bottom-1 left-0 z-[2] sm:left-0.5">
            <ProfileEidPerformanceSeal notaEid={card.eid} compact title={`Nota EID ${card.eid.toFixed(1)}`} />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 z-[1] h-2.5 w-2.5 rounded-full border-2 border-eid-card shadow-sm sm:h-3 sm:w-3 ${
              card.disponivelAmistoso ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" : "bg-red-500"
            }`}
            title={card.disponivelAmistoso ? "Disponível para amistoso" : "Indisponível para amistoso"}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[12px] font-black leading-tight tracking-tight text-eid-fg sm:text-[13px]">{card.nome}</h3>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-eid-primary-400">{card.esporteNome}</p>
          <p className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-semibold tabular-nums text-eid-action-500 sm:text-[9px]" title="Pontos no ranking de match">
            <Trophy className="h-2.5 w-2.5 shrink-0 text-eid-action-400 sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden />
            <span>{card.rank}</span>
            <span className="font-medium text-eid-text-secondary">pts</span>
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1 border-t border-[color:var(--eid-border-subtle)]/65 pt-2">
        <div className="flex flex-wrap items-stretch gap-1.5">
          <Link
            href={desafioHref}
            className="eid-btn-match-cta inline-flex min-h-[32px] min-w-0 flex-1 items-center justify-center rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide sm:min-h-[34px] sm:rounded-xl sm:px-3 sm:text-[10px]"
          >
            {matchFinalidade === "amistoso" ? "Solicitar match amistoso" : "Solicitar match ranking"}
          </Link>
          <Link
            href={card.href}
            className="inline-flex min-h-[32px] shrink-0 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1.5 text-[9px] font-semibold text-eid-text-secondary transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] hover:text-eid-primary-300 sm:min-h-[34px] sm:rounded-xl sm:px-3 sm:text-[10px]"
          >
            Perfil
          </Link>
        </div>
        {!card.canChallenge && card.challengeHint ? (
          <p className="text-[8px] leading-snug text-eid-text-secondary sm:text-[9px]">{card.challengeHint}</p>
        ) : null}
      </div>
    </article>
  );
}
