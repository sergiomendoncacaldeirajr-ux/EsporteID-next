"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { matchCardEidStatsHref, type MatchRadarCard, type MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { PROFILE_CARD_BASE, PROFILE_PUBLIC_AVATAR_RING_CLASS } from "@/components/perfil/profile-ui-tokens";
import {
  isMatchChallengeBlockedByMissingFormation,
  MatchChallengeAction,
  MatchChallengeMissingFormationPrompt,
} from "@/components/match/match-challenge-action";
import { SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

type Props = {
  card: MatchRadarCard;
  esporteContextId: string;
  matchFinalidade: MatchRadarFinalidade;
  viewerEsportesComDupla: readonly number[];
  viewerEsportesComTime: readonly number[];
  suppressChallengeHint?: boolean;
};

/** Radar/desafio: só o primeiro nome (individual, dupla e time). */
function compactCardName(fullName: string) {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return fullName.trim() || "—";
  return parts[0] ?? "—";
}

export function MatchRadarCardView({
  card,
  esporteContextId,
  matchFinalidade,
  viewerEsportesComDupla,
  viewerEsportesComTime,
  suppressChallengeHint = false,
}: Props) {
  const [missingFormationPromptOpen, setMissingFormationPromptOpen] = useState(false);

  const esporteParam = card.esporteId > 0 ? String(card.esporteId) : esporteContextId;
  const desafioHref = `/desafio?id=${encodeURIComponent(card.id)}&tipo=${encodeURIComponent(card.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(matchFinalidade)}`;
  const eidStatsHref = matchCardEidStatsHref(card);

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const displayName = compactCardName(card.nome);

  const avatarSize = "h-[3.6rem] w-[3.6rem] min-[390px]:h-[4.2rem] min-[390px]:w-[4.2rem] sm:h-[4.4rem] sm:w-[4.4rem]";
  const matchCtaTitle =
    matchFinalidade === "amistoso" ? "Solicitar desafio amistoso" : "Solicitar desafio ranking";
  const quickViewHref = eidStatsHref ?? card.href;

  const avatarInner = card.avatarUrl ? (
    <Image
      src={card.avatarUrl}
      alt=""
      fill
      unoptimized
      className={`h-full w-full ${PROFILE_PUBLIC_AVATAR_RING_CLASS} !object-cover object-center`}
    />
  ) : (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-xs font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-sm`}
    >
      {initials}
    </div>
  );

  const blockedByMissingFormation = isMatchChallengeBlockedByMissingFormation(
    card.modalidade,
    card.esporteId,
    viewerEsportesComDupla,
    viewerEsportesComTime
  );

  useEffect(() => {
    setMissingFormationPromptOpen(false);
  }, [card.id, card.modalidade, card.esporteId]);

  const eidSeal = (
    <ProfileEidPerformanceSeal
      notaEid={card.eid}
      compact
      className="scale-[1.22] transition hover:brightness-110 motion-safe:hover:scale-[1.24]"
      title={`Nota EID ${card.eid.toFixed(1)} — ver estatísticas no esporte`}
    />
  );

  return (
    <article
      className={`${PROFILE_CARD_BASE} relative isolate flex min-w-0 flex-col overflow-hidden !rounded-2xl p-2 ring-1 ring-[color:color-mix(in_srgb,var(--eid-fg)_3%,transparent)] max-[390px]:p-1.5 [content-visibility:auto] motion-safe:transition-[box-shadow] motion-safe:hover:shadow-[0_14px_30px_-20px_rgba(15,23,42,0.28)] sm:p-2.5`}
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
          <h3 className="truncate text-[13px] font-black leading-tight tracking-tight text-eid-fg min-[390px]:text-[14px] sm:text-[15px]" title={card.nome}>
            {displayName}
          </h3>
          <MatchChallengeAction
            modalidade={card.modalidade}
            desafioHref={desafioHref}
            className="eid-btn-match-cta relative mt-1 inline-flex min-h-[28px] w-full max-w-full items-center justify-center overflow-hidden rounded-md px-2 py-1 text-[9px] font-bold uppercase leading-none tracking-[0.04em]"
            title={matchCtaTitle}
            cardEsporteId={card.esporteId}
            viewerEsportesComDupla={viewerEsportesComDupla}
            viewerEsportesComTime={viewerEsportesComTime}
            detachMissingFormationPrompt
            missingFormationPromptOpen={missingFormationPromptOpen}
            onMissingFormationPromptChange={setMissingFormationPromptOpen}
          />
        </div>
      </div>

      {blockedByMissingFormation && missingFormationPromptOpen ? (
        <div className="relative z-[1] mt-1 w-full min-w-0">
          <MatchChallengeMissingFormationPrompt
            esporteId={card.esporteId}
            modalidade={card.modalidade === "time" ? "time" : "dupla"}
            open
            onClose={() => setMissingFormationPromptOpen(false)}
          />
        </div>
      ) : null}

      <div className="relative z-[1] mt-2">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,transparent)] bg-eid-surface/45 px-2 py-1">
          <p className="min-w-0 truncate text-[10px] font-semibold text-eid-primary-300" title={card.esporteNome}>
            <span className="inline-flex items-center gap-1">
              <SportGlyphIcon sportName={card.esporteNome} />
              <span>{card.esporteNome}</span>
            </span>
          </p>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,transparent)] bg-eid-surface/70 px-1.5 py-0.5 text-[9px] font-bold text-eid-fg/90"
            title="Pontos no ranking de desafio"
          >
            <Trophy className="h-2.5 w-2.5 shrink-0 text-eid-action-400" strokeWidth={2.25} aria-hidden />
            {card.rank} pts
          </span>
        </div>
      </div>

      {!suppressChallengeHint && !card.canChallenge && card.challengeHint ? (
        <p className="mt-1.5 text-[8px] leading-snug text-eid-text-secondary sm:text-[9px]">{card.challengeHint}</p>
      ) : null}
    </article>
  );
}
