"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { matchCardEidStatsHref, type MatchRadarCard, type MatchRadarFinalidade } from "@/lib/match/radar-snapshot";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { PROFILE_CARD_BASE, PROFILE_PUBLIC_FORMACAO_ESCUDO_CLASS } from "@/components/perfil/profile-ui-tokens";
import {
  isMatchChallengeBlockedByMissingFormation,
  MatchChallengeAction,
  MatchChallengeMissingFormationPrompt,
} from "@/components/match/match-challenge-action";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

function rowDesafioHref(row: MatchRadarCard, esporteContextId: string) {
  const esporteParam = row.esporteId > 0 ? String(row.esporteId) : esporteContextId;
  const fin: MatchRadarFinalidade =
    row.modalidade !== "individual" ? "ranking" : row.interesseMatch === "amistoso" ? "amistoso" : "ranking";
  return `/desafio?id=${encodeURIComponent(row.id)}&tipo=${encodeURIComponent(row.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(fin)}`;
}

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

function radarMetaCn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function matchRadarRankPosition(card: MatchRadarCard): number | null {
  return card.posicaoRank != null && Number.isFinite(card.posicaoRank) && card.posicaoRank > 0
    ? card.posicaoRank
    : null;
}

/** Selo de posição no ranking (somente por pontos): só o número, sem ícone. */
export function RadarRankSeal({ position, compact }: { position: number | null; compact: boolean }) {
  const has = position != null && position > 0;
  const numCls = compact
    ? "text-[8px] font-semibold tabular-nums tracking-tight"
    : "text-[9px] font-semibold tabular-nums tracking-tight min-[390px]:text-[10px]";
  return (
    <span
      className={radarMetaCn(
        "inline-flex max-w-full items-center justify-center rounded-full border border-amber-400/18 bg-[color-mix(in_srgb,var(--eid-warning-500)_10%,transparent)] px-1.5 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[2px] eid-light:border-amber-600/22 eid-light:bg-[color-mix(in_srgb,var(--eid-warning-500)_7%,#fff)]",
        !compact && "min-[390px]:px-2"
      )}
      title="Posição no ranking por pontos"
    >
      <span className={radarMetaCn("min-w-0 tabular-nums text-amber-100/95 eid-light:text-amber-950/90", numCls)}>
        {has ? `${position}º` : "—"}
      </span>
    </span>
  );
}

function RadarVictorySeal({ count, compact }: { count: number; compact: boolean }) {
  const numCls = compact
    ? "text-[8px] font-semibold tabular-nums tracking-tight"
    : "text-[9px] font-semibold tabular-nums tracking-tight min-[390px]:text-[10px]";
  return (
    <span
      className={radarMetaCn(
        "inline-flex max-w-full items-baseline gap-0.5 rounded-full border border-emerald-400/18 bg-[color-mix(in_srgb,var(--eid-success-500)_9%,transparent)] px-1.5 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[2px] eid-light:border-emerald-600/20 eid-light:bg-[color-mix(in_srgb,var(--eid-success-500)_6%,#fff)]",
        !compact && "min-[390px]:gap-1 min-[390px]:px-2"
      )}
      title="Vitórias no ranking"
    >
      <span
        className={radarMetaCn(
          "shrink-0 font-semibold leading-none text-emerald-400 eid-light:text-emerald-600",
          numCls
        )}
        aria-hidden
      >
        V
      </span>
      <span className={radarMetaCn("text-emerald-100/95 eid-light:text-emerald-950/90", numCls)}>{count}</span>
    </span>
  );
}

function RadarDefeatSeal({ count, compact }: { count: number; compact: boolean }) {
  const numCls = compact
    ? "text-[8px] font-semibold tabular-nums tracking-tight"
    : "text-[9px] font-semibold tabular-nums tracking-tight min-[390px]:text-[10px]";
  return (
    <span
      className={radarMetaCn(
        "inline-flex max-w-full items-baseline gap-0.5 rounded-full border border-rose-400/18 bg-[color-mix(in_srgb,var(--eid-danger-500)_9%,transparent)] px-1.5 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[2px] eid-light:border-rose-600/20 eid-light:bg-[color-mix(in_srgb,var(--eid-danger-500)_6%,#fff)]",
        !compact && "min-[390px]:gap-1 min-[390px]:px-2"
      )}
      title="Derrotas no ranking"
    >
      <span
        className={radarMetaCn(
          "shrink-0 font-semibold leading-none text-rose-400 eid-light:text-rose-600",
          numCls
        )}
        aria-hidden
      >
        D
      </span>
      <span className={radarMetaCn("text-rose-100/95 eid-light:text-rose-950/90", numCls)}>{count}</span>
    </span>
  );
}

/**
 * Vitórias e derrotas lado a lado, abaixo do nome (selo de posição à direita do nome, mesma linha).
 */
export function MatchRadarOpponentMetaStack({ card, compact = false }: { card: MatchRadarCard; compact?: boolean }) {
  const vit = card.vitorias ?? 0;
  const der = card.derrotas ?? 0;
  return (
    <div
      className={radarMetaCn(
        "mt-1 flex flex-nowrap items-center gap-1.5",
        compact && "mt-0.5 gap-1"
      )}
      aria-label="Vitórias e derrotas no ranking"
    >
      <RadarVictorySeal count={vit} compact={compact} />
      <RadarDefeatSeal count={der} compact={compact} />
    </div>
  );
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

  const desafioHref = rowDesafioHref(card, esporteContextId);
  const eidStatsHref = matchCardEidStatsHref(card);

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const displayName = compactCardName(card.nome);
  const isIndividual = card.modalidade === "individual";
  const avatarShape = isIndividual ? "rounded-full" : "rounded-[14px]";

  const avatarSize = "h-[3.6rem] w-[3.6rem] min-[390px]:h-[4.2rem] min-[390px]:w-[4.2rem] sm:h-[4.4rem] sm:w-[4.4rem]";
  const matchCtaTitle =
    matchFinalidade === "amistoso" ? "Solicitar desafio amistoso" : "Solicitar desafio ranking";
  const quickViewHref = eidStatsHref ?? card.href;

  const avatarRingShellIndividual =
    "rounded-full border-[3px] border-eid-card shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]";

  const avatarInner = card.avatarUrl ? (
    <div
      className={
        isIndividual
          ? `relative h-full w-full overflow-hidden bg-eid-card ${avatarRingShellIndividual}`
          : `relative h-full w-full overflow-hidden bg-eid-card ${PROFILE_PUBLIC_FORMACAO_ESCUDO_CLASS}`
      }
    >
      <Image
        src={card.avatarUrl}
        alt=""
        fill
        sizes="(max-width: 390px) 3.6rem, 4.4rem"
        unoptimized
        className={isIndividual ? "object-contain object-center p-[10%]" : "object-cover object-center"}
      />
    </div>
  ) : (
    <div
      className={
        isIndividual
          ? `flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-xs font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] sm:text-sm`
          : `flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-black text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] sm:text-sm`
      }
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
            className={`relative block size-full overflow-hidden ${avatarShape} p-0 outline-none ring-offset-2 ring-offset-eid-card transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-eid-primary-400`}
          >
            {avatarInner}
          </ProfileEditDrawerTrigger>
          <span
            className={`pointer-events-none absolute inset-0 z-[1] ${avatarShape} border-2 motion-safe:animate-pulse ${
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
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-[13px] font-black leading-tight tracking-tight text-eid-fg min-[390px]:text-[14px] sm:text-[15px]"
              title={card.nome}
            >
              {displayName}
            </h3>
            <span className="shrink-0">
              <RadarRankSeal position={matchRadarRankPosition(card)} compact={false} />
            </span>
          </div>
          <MatchRadarOpponentMetaStack card={card} />
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

      <div className="relative z-[1] mt-2 space-y-1">
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
        <p
          className="inline-flex max-w-full items-center gap-1 px-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"
          title="Modalidade no ranking"
        >
          <ModalidadeGlyphIcon
            modalidade={card.modalidade === "time" ? "time" : card.modalidade === "dupla" ? "dupla" : "individual"}
          />
          {card.modalidade === "individual" ? "Individual" : card.modalidade === "dupla" ? "Dupla" : "Time"}
        </p>
      </div>

      {!suppressChallengeHint && !card.canChallenge && card.challengeHint ? (
        <p className="mt-1.5 text-[8px] leading-snug text-eid-text-secondary sm:text-[9px]">{card.challengeHint}</p>
      ) : null}

      <div className="relative z-[1] mt-2">
        <MatchChallengeAction
          modalidade={card.modalidade}
          desafioHref={desafioHref}
          desafioVariants={undefined}
          className="eid-btn-match-cta relative inline-flex min-h-[30px] w-full max-w-full items-center justify-center overflow-hidden rounded-[8px] px-2.5 py-1 text-[9px] font-bold uppercase leading-none tracking-[0.04em]"
          title={matchCtaTitle}
          cardEsporteId={card.esporteId}
          viewerEsportesComDupla={viewerEsportesComDupla}
          viewerEsportesComTime={viewerEsportesComTime}
          detachMissingFormationPrompt
          missingFormationPromptOpen={missingFormationPromptOpen}
          onMissingFormationPromptChange={setMissingFormationPromptOpen}
        />
      </div>
    </article>
  );
}
