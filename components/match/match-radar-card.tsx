"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import type { MatchRadarCard, MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { sportIconEmoji } from "@/lib/perfil/sport-icon-emoji";
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

  const avatarSize = "h-[46px] w-[46px] sm:h-[50px] sm:w-[50px]";
  const esporteIcon = sportIconEmoji(card.esporteNome);

  return (
    <article
      className={`${PROFILE_CARD_BASE} p-1.5 [content-visibility:auto] motion-safe:transition-[box-shadow] motion-safe:hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38),0_0_16px_-14px_rgba(37,99,235,0.35)] sm:p-2`}
    >
      <div className="flex gap-1.5 sm:gap-2">
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
              className={`flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-[10px] font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-[11px]`}
            >
              {initials}
            </div>
          )}
          <div className="pointer-events-none absolute -bottom-0.5 left-0 z-[2] scale-[0.92] origin-bottom-left sm:left-0.5 sm:scale-95">
            <ProfileEidPerformanceSeal notaEid={card.eid} compact title={`Nota EID ${card.eid.toFixed(1)}`} />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 z-[1] h-2.5 w-2.5 rounded-full border-2 border-eid-card shadow-sm sm:h-2.5 sm:w-2.5 ${
              card.disponivelAmistoso ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" : "bg-red-500"
            }`}
            title={card.disponivelAmistoso ? "Disponível para amistoso" : "Indisponível para amistoso"}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[11px] font-black leading-tight tracking-tight text-eid-fg sm:text-[12px]">{card.nome}</h3>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] leading-tight sm:text-[9px]">
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 font-semibold text-eid-primary-400">
              <span className="shrink-0 text-[10px] leading-none sm:text-[11px]" aria-hidden>
                {esporteIcon}
              </span>
              <span className="truncate" title={card.esporteNome}>
                {card.esporteNome}
              </span>
            </span>
            <span className="shrink-0 text-eid-text-secondary/75" aria-hidden>
              ·
            </span>
            <span
              className="inline-flex shrink-0 items-center gap-0.5 font-semibold tabular-nums text-eid-action-500"
              title="Pontos no ranking de match"
            >
              <Trophy className="h-2 w-2 shrink-0 text-eid-action-400 sm:h-2.5 sm:w-2.5" strokeWidth={2.25} aria-hidden />
              <span>{card.rank}</span>
              <span className="font-medium text-eid-text-secondary">pts</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-0.5 border-t border-[color:var(--eid-border-subtle)]/65 pt-1.5">
        <div className="flex items-stretch gap-1">
          <Link
            href={desafioHref}
            className="eid-btn-match-cta inline-flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-md px-1.5 py-1 text-[7px] font-black uppercase leading-tight tracking-wide sm:rounded-lg sm:px-2 sm:py-1.5 sm:text-[8px]"
          >
            <span className="text-center">
              {matchFinalidade === "amistoso" ? (
                <>
                  Match
                  <span className="block sm:inline sm:pl-0.5">amistoso</span>
                </>
              ) : (
                <>
                  Match
                  <span className="block sm:inline sm:pl-0.5">ranking</span>
                </>
              )}
            </span>
          </Link>
          <Link
            href={card.href}
            className="inline-flex min-h-0 shrink-0 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[7px] font-semibold uppercase tracking-wide text-eid-text-secondary transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] hover:text-eid-primary-300 sm:rounded-lg sm:px-2.5 sm:text-[8px]"
          >
            Perfil
          </Link>
        </div>
        {!card.canChallenge && card.challengeHint ? (
          <p className="text-[7px] leading-snug text-eid-text-secondary sm:text-[8px]">{card.challengeHint}</p>
        ) : null}
      </div>
    </article>
  );
}
