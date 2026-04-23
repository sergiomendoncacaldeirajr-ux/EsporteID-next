"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { matchCardEidStatsHref, type MatchRadarCard, type MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
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
  const eidStatsHref = matchCardEidStatsHref(card);

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const displayName = card.nome.trim().split(/\s+/u)[0] || card.nome;

  const avatarSize = "h-14 w-14 min-[390px]:h-[4.5rem] min-[390px]:w-[4.5rem] sm:h-[4.85rem] sm:w-[4.85rem]";
  const esporteIcon = sportIconEmoji(card.esporteNome);
  const matchCtaTitle =
    matchFinalidade === "amistoso" ? "Solicitar match amistoso" : "Solicitar match ranking";
  const quickViewHref = eidStatsHref ?? card.href;

  const avatarInner = card.avatarUrl ? (
    <img
      src={card.avatarUrl}
      alt=""
      className={`h-full w-full ${PROFILE_PUBLIC_AVATAR_RING_CLASS}`}
      loading="lazy"
    />
  ) : (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-xs font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-sm`}
    >
      {initials}
    </div>
  );

  const eidSeal = (
    <ProfileEidPerformanceSeal
      notaEid={card.eid}
      compact
      className="scale-110 transition hover:brightness-110 motion-safe:hover:scale-[1.12]"
      title={`Nota EID ${card.eid.toFixed(1)} — ver estatísticas no esporte`}
    />
  );

  return (
    <article
      className={`${PROFILE_CARD_BASE} relative isolate overflow-hidden flex min-w-0 flex-col p-2 max-[390px]:p-1.5 [content-visibility:auto] motion-safe:transition-[box-shadow] motion-safe:hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38),0_0_16px_-14px_rgba(37,99,235,0.35)] sm:p-3`}
    >
      <span
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--eid-primary-500) 16%, transparent) 0%, transparent 62%), radial-gradient(110% 70% at 100% 100%, color-mix(in srgb, var(--eid-action-500) 14%, transparent) 0%, transparent 66%)",
        }}
      />
      <div className="relative z-[1] flex min-w-0 gap-2 max-[390px]:gap-1.5 sm:gap-3">
        <div className={`relative shrink-0 self-start ${avatarSize}`}>
          <ProfileEditDrawerTrigger
            href={quickViewHref}
            title={`Estatísticas EID de ${card.nome}`}
            fullscreen
            topMode="backOnly"
            className="block size-full overflow-hidden rounded-full outline-none ring-offset-2 ring-offset-eid-card transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-eid-primary-400"
          >
            {avatarInner}
          </ProfileEditDrawerTrigger>
          <span
            className={`pointer-events-none absolute inset-0 z-[1] rounded-full border-2 motion-safe:animate-pulse ${
              card.disponivelAmistoso
                ? "border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_0_12px_rgba(16,185,129,0.75)]"
                : "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.45),0_0_12px_rgba(239,68,68,0.72)]"
            }`}
            aria-hidden
          />
          <div className="absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2">
            {eidStatsHref ? (
              <ProfileEditDrawerTrigger
                href={eidStatsHref}
                title={`Estatísticas EID de ${card.esporteNome} — ${card.nome}`}
                fullscreen
                topMode="backOnly"
                className="inline-flex rounded-full outline-none ring-offset-1 ring-offset-eid-card focus-visible:ring-2 focus-visible:ring-eid-primary-400"
              >
                {eidSeal}
              </ProfileEditDrawerTrigger>
            ) : (
              <span className="inline-flex opacity-90">{eidSeal}</span>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col pt-0.5">
          <h3 className="truncate text-[12px] font-black leading-tight tracking-tight text-eid-fg min-[390px]:text-[13px] sm:text-sm" title={card.nome}>
            {displayName}
          </h3>
          <div className="mt-0.5 min-[390px]:mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 min-[390px]:gap-x-1.5 text-[9px] min-[390px]:text-[10px] leading-tight text-eid-primary-400 sm:text-[11px]">
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 font-semibold">
              <span className="shrink-0 text-[11px] leading-none sm:text-xs" aria-hidden>
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
              <Trophy className="h-2.5 w-2.5 shrink-0 text-eid-action-400 sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden />
              <span>{card.rank}</span>
              <span className="font-medium text-eid-text-secondary">pts</span>
            </span>
          </div>

          <Link
            href={desafioHref}
            title={matchCtaTitle}
            aria-label={matchCtaTitle}
            className="eid-btn-match-cta eid-match-cta-pulse eid-shimmer-btn relative mt-1.5 min-[390px]:mt-2 inline-flex w-full max-w-full items-center justify-center overflow-hidden rounded-lg px-2 py-1.5 min-[390px]:px-2.5 min-[390px]:py-2 text-[9px] min-[390px]:text-[10px] font-black uppercase leading-tight tracking-[0.12em] sm:mt-2.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[11px]"
          >
            Match
          </Link>
        </div>
      </div>

      {!card.canChallenge && card.challengeHint ? (
        <p className="mt-1.5 text-[8px] leading-snug text-eid-text-secondary sm:text-[9px]">{card.challengeHint}</p>
      ) : null}
    </article>
  );
}
