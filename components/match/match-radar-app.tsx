"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Grid2x2, Handshake, Maximize2, Trophy, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { refreshMatchRadarAction, setViewerDisponivelAmistoso } from "@/app/match/actions";
import type { EsporteConfrontoRow } from "@/lib/match/esportes-confronto";
import type { MatchRadarCard, MatchRadarFinalidade, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";
import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import {
} from "@/components/match/match-radar-card";
import {
  isMatchChallengeBlockedByMissingFormation,
  MatchChallengeAction,
  MatchChallengeMissingFormationPrompt,
} from "@/components/match/match-challenge-action";
import { MatchRankingRulesModal } from "@/components/match/match-ranking-rules-modal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import {
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_PUBLIC_AVATAR_RING_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { matchCardEidStatsHref } from "@/lib/match/radar-snapshot";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Radar/desafio: só o primeiro nome (individual, dupla e time). */
function compactCardName(fullName: string) {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return fullName.trim() || "—";
  return parts[0] ?? "—";
}

/** Mini card (tela cheia): figurinha vertical com nome, foto+EID, esporte e modalidade. */
function MatchRadarGridMiniChallengeBlock({
  card,
  desafioHref,
  nomeCurto,
  avatarColumn,
  esporteNome,
  modalidadeLabel,
  compact = false,
  viewerEsportesComDupla,
  viewerEsportesComTime,
}: {
  card: MatchRadarCard;
  desafioHref: string;
  nomeCurto: string;
  avatarColumn: ReactNode;
  esporteNome: string;
  modalidadeLabel: string | null;
  compact?: boolean;
  viewerEsportesComDupla: readonly number[];
  viewerEsportesComTime: readonly number[];
}) {
  const [missingFormationPromptOpen, setMissingFormationPromptOpen] = useState(false);
  const blockedByMissingFormation = isMatchChallengeBlockedByMissingFormation(
    card.modalidade,
    card.esporteId,
    viewerEsportesComDupla,
    viewerEsportesComTime
  );

  useEffect(() => {
    setMissingFormationPromptOpen(false);
  }, [card.id, card.modalidade, card.esporteId]);

  return (
    <>
      <div className="flex min-w-0 flex-col items-center text-center">
        <div className="flex w-full min-w-0 items-center justify-center gap-0.5">
          <span
            className="-ml-1 inline-flex shrink-0 text-[color:color-mix(in_srgb,var(--eid-action-500)_82%,#f59e0b_18%)]"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(compact ? "h-[1.05rem] w-[1.05rem]" : "h-[1.35rem] w-[1.35rem]", "-translate-y-[0.5px]")}
              fill="none"
              stroke="currentColor"
              strokeWidth={compact ? 2.4 : 2.7}
            >
              <path d="M4 10l4 2" strokeLinecap="round" />
              <path d="M5 5l4 3" strokeLinecap="round" />
            </svg>
          </span>
          <p
            className={cn(
              "min-w-0 truncate font-black leading-none tracking-tight text-eid-fg",
              compact ? "text-[12px]" : "text-[14px]"
            )}
            title={card.nome}
          >
            {nomeCurto}
          </p>
          <span
            className="inline-flex shrink-0 text-[color:color-mix(in_srgb,var(--eid-action-500)_82%,#f59e0b_18%)]"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(
                compact ? "h-[1.05rem] w-[1.05rem]" : "h-[1.35rem] w-[1.35rem]",
                "-translate-y-[0.5px] -scale-x-100"
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth={compact ? 2.4 : 2.7}
            >
              <path d="M4 10l4 2" strokeLinecap="round" />
              <path d="M5 5l4 3" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className={compact ? "mt-1.5" : "mt-2"}>{avatarColumn}</div>
        <p
          className={cn(
            "inline-flex max-w-full items-center gap-1 truncate font-bold text-eid-primary-400",
            compact ? "mt-2 text-[10px]" : "mt-3 text-[11px]"
          )}
          title={esporteNome}
        >
          <SportGlyphIcon sportName={esporteNome} />
          <span className="truncate">{esporteNome}</span>
        </p>
        {modalidadeLabel ? (
          <p
            className={cn(
              "inline-flex items-center gap-1 font-semibold uppercase tracking-[0.08em] text-eid-text-secondary",
              compact ? "mt-0.5 text-[7px]" : "mt-1 text-[8px]"
            )}
          >
            <ModalidadeGlyphIcon modalidade={card.modalidade === "dupla" ? "dupla" : "time"} />
            {modalidadeLabel}
          </p>
        ) : null}
        <div className={cn("flex w-full items-center gap-2 px-1", compact ? "mt-0.5" : "mt-1")} aria-hidden>
          <span className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,transparent)]" />
          <span className="text-[10px] text-[color:color-mix(in_srgb,var(--eid-primary-500)_55%,var(--eid-text-secondary)_45%)]">
            ✦
          </span>
          <span className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,transparent)]" />
        </div>
        <MatchChallengeAction
          modalidade={card.modalidade}
          desafioHref={desafioHref}
          desafioVariants={undefined}
          className={cn(
            "eid-btn-match-cta inline-flex items-center justify-center border border-orange-200/35 bg-[linear-gradient(180deg,#ffb14a_0%,#ff8d1c_48%,#ef6c00_100%)] font-black uppercase text-white shadow-[0_8px_18px_-10px_rgba(239,108,0,0.75)]",
            compact
              ? "mt-1 min-h-[24px] w-[84%] max-w-[9rem] rounded-lg px-1.5 py-0.5 text-[8px] tracking-[0.04em]"
              : "mt-1.5 min-h-[30px] w-[86%] max-w-[11rem] rounded-xl px-2 py-1 text-[10px] tracking-[0.05em]"
          )}
          title="Solicitar desafio"
          viewerEsportesComDupla={viewerEsportesComDupla}
          viewerEsportesComTime={viewerEsportesComTime}
          cardEsporteId={card.esporteId}
          detachMissingFormationPrompt
          missingFormationPromptOpen={missingFormationPromptOpen}
          onMissingFormationPromptChange={setMissingFormationPromptOpen}
        />
      </div>
      {blockedByMissingFormation && missingFormationPromptOpen ? (
        <div className="mt-1 w-full min-w-0">
          <MatchChallengeMissingFormationPrompt
            esporteId={card.esporteId}
            modalidade={card.modalidade === "time" ? "time" : "dupla"}
            open
            onClose={() => setMissingFormationPromptOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}

/** Versão mini da figurinha para o modo grade (não fullscreen). */
function MatchRadarGridStickerCard({
  card,
  esporteContextId,
  viewerEsportesComDupla,
  viewerEsportesComTime,
}: {
  card: MatchRadarCard;
  esporteContextId: string;
  viewerEsportesComDupla: readonly number[];
  viewerEsportesComTime: readonly number[];
}) {
  const esporteParam = card.esporteId > 0 ? String(card.esporteId) : esporteContextId;
  const cardFinalidade =
    card.modalidade !== "individual" ? "ranking" : card.interesseMatch === "amistoso" ? "amistoso" : "ranking";
  const desafioHref = `/desafio?id=${encodeURIComponent(card.id)}&tipo=${encodeURIComponent(card.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(cardFinalidade)}`;
  const nomeCurto = compactCardName(card.nome);
  const modalidadeLabel = card.modalidade === "individual" ? null : card.modalidade === "dupla" ? "Dupla" : "Time";
  const esporteIdStats = /^\d+$/.test(esporteParam) ? Number(esporteParam) : card.esporteId;
  const eidStatsHref =
    esporteIdStats > 0
      ? card.modalidade === "individual"
        ? `/perfil/${encodeURIComponent(card.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
        : `/perfil-time/${encodeURIComponent(card.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
      : matchCardEidStatsHref(card);

  const avatarBlock = card.avatarUrl ? (
    <Image
      src={card.avatarUrl}
      alt=""
      fill
      unoptimized
      className={`h-full w-full ${PROFILE_PUBLIC_AVATAR_RING_CLASS} !object-cover object-center`}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-surface text-[10px] font-black text-eid-primary-300">
      EID
    </div>
  );

  const avatarColumn = (
    <div className="relative h-[3.9rem] w-[3.9rem] shrink-0">
      <ProfileEditDrawerTrigger
        href={eidStatsHref ?? card.href}
        title={`Estatísticas EID de ${card.nome}`}
        fullscreen
        topMode="backOnly"
        className="block h-[3.9rem] w-[3.9rem] overflow-hidden rounded-full border-2 border-orange-200/65 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--eid-surface)_86%,white_14%),0_10px_26px_-16px_rgba(239,108,0,0.55)]"
      >
        {avatarBlock}
      </ProfileEditDrawerTrigger>
      <span
        className={`pointer-events-none absolute inset-0 rounded-full border-2 motion-safe:animate-pulse ${
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
            className="inline-flex rounded-full"
          >
            <ProfileEidPerformanceSeal notaEid={card.eid} compact className="scale-[1.1]" />
          </ProfileEditDrawerTrigger>
        ) : (
          <ProfileEidPerformanceSeal notaEid={card.eid} compact className="scale-[1.1]" />
        )}
      </div>
    </div>
  );

  return (
    <article className="relative isolate overflow-hidden rounded-[1.2rem] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,white_18%)] bg-[radial-gradient(130%_100%_at_0%_0%,color-mix(in_srgb,var(--eid-primary-500)_7%,white_93%)_0%,transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_98%,white_2%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-2 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)] ring-1 ring-[color:color-mix(in_srgb,var(--eid-fg)_4%,transparent)]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <span className="absolute -left-8 -top-7 rotate-[-12deg] text-[88px] opacity-[0.03] blur-[0.2px]">⚽</span>
        <span className="absolute -right-7 top-2 rotate-[16deg] text-[84px] opacity-[0.028] blur-[0.2px]">🎾</span>
        <span className="absolute -left-6 bottom-1 rotate-[8deg] text-[92px] opacity-[0.026] blur-[0.2px]">🏀</span>
        <span className="absolute -right-5 bottom-0 rotate-[-10deg] text-[80px] opacity-[0.024] blur-[0.2px]">🏸</span>
      </div>
      <div className="relative z-[1]">
        <MatchRadarGridMiniChallengeBlock
          card={card}
          desafioHref={desafioHref}
          nomeCurto={nomeCurto}
          avatarColumn={avatarColumn}
          esporteNome={card.esporteNome}
          modalidadeLabel={modalidadeLabel}
          compact
          viewerEsportesComDupla={viewerEsportesComDupla}
          viewerEsportesComTime={viewerEsportesComTime}
        />
      </div>
    </article>
  );
}

function segmentTab(active: boolean, pending = false) {
  return cn(
    "inline-flex min-w-0 flex-1 min-h-[1.62rem] touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-tight tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] disabled:opacity-50",
    pending && "animate-pulse",
    active
      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35"
  );
}

function filterChip(active: boolean, pending = false) {
  return cn(
    "inline-flex h-[1.6rem] touch-manipulation items-center justify-center whitespace-nowrap rounded-md px-1.5 text-[8px] font-semibold uppercase leading-tight tracking-[0.03em] transition-all duration-200 ease-out motion-safe:transform-gpu active:scale-[0.985] disabled:opacity-50",
    pending && "animate-pulse",
    active
      ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55"
  );
}

const FILTER_LABEL = "mb-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-eid-text-secondary";

/** Cartão de filtros — alinhado ao ranking/dashboard. */
const matchFilterCardClass =
  "eid-match-filter-card overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.2)] [&_button]:[-webkit-tap-highlight-color:transparent]";

const matchSectionHeadClass =
  "eid-match-section-head flex items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_58%,transparent)] bg-transparent px-3 py-2.5 sm:px-4";

const matchSectionTitleClass =
  "text-[12px] font-black uppercase tracking-[0.06em] text-eid-fg";

const matchBadgeGhostClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_6%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_24%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_10%,transparent)]";

const matchResultsCardClass =
  "eid-match-results-card overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.2)]";

type Props = {
  viewerId: string;
  initialCards: MatchRadarCard[];
  esportes: EsporteConfrontoRow[];
  /** Filtro de esporte na UI: `"all"` ou id numérico */
  initialEsporteFiltro: string;
  /** Esportes do perfil em confronto: busca do radar em tela cheia sempre usa esta lista (o chip só filtra a exibição). */
  fullRadarFetchEsporteIds: string[];
  initialTipo: RadarTipo;
  initialSortBy: SortBy;
  initialRaio: number;
  initialFinalidade: MatchRadarFinalidade;
  initialView: "full" | "grid";
  initialGeneroFiltro: "all" | "masculino" | "feminino" | "outro";
  viewerDisponivelAmistoso: boolean;
  /** ISO da janela de 4h quando o modo amistoso está ligado */
  viewerAmistosoExpiresAt: string | null;
  showSentBanner: boolean;
  viewerEsportesComDupla: number[];
  viewerEsportesComTime: number[];
  /** Esportes em que o viewer tem confronto na modalidade individual (`usuario_eid.modalidades_match`). */
  viewerEsportesIndividual: number[];
};

const RAII = [10, 30, 50, 100] as const;

const MATCH_RADAR_FILTROS_PANEL_ID = "match-radar-filtros-esporte-raio-ord";
const MATCH_AMISTOSO_ENTRY_INFO_SEEN_KEY = "eid_match_amistoso_entry_info_seen_v1";
const MATCH_AMISTOSO_ENTRY_DECLINED_DAY_KEY = "eid_match_amistoso_entry_declined_day_v1";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sortByLabelShort(sortBy: SortBy) {
  return sortBy === "eid_score" ? "Nota EID" : "Pontos rank";
}

export function MatchRadarApp({
  viewerId,
  initialCards,
  esportes,
  initialEsporteFiltro,
  fullRadarFetchEsporteIds,
  initialTipo,
  initialSortBy,
  initialRaio,
  initialFinalidade,
  initialView,
  initialGeneroFiltro,
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
  showSentBanner,
  viewerEsportesComDupla,
  viewerEsportesComTime,
  viewerEsportesIndividual,
}: Props) {
  const [tipo, setTipo] = useState<RadarTipo>(initialTipo);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [raio, setRaio] = useState(initialRaio);
  const [esporte, setEsporte] = useState(initialEsporteFiltro);
  const [finalidade, setFinalidade] = useState<MatchRadarFinalidade>(initialFinalidade);
  const [cards, setCards] = useState<MatchRadarCard[]>(initialCards);
  const [viewMode, setViewMode] = useState<"full" | "grid">(initialView);
  const [generoFiltro, setGeneroFiltro] = useState<"all" | "masculino" | "feminino" | "outro">(initialGeneroFiltro);
  const [isPending, startTransition] = useTransition();
  const [entryPending, setEntryPending] = useState(false);
  const [radarFiltrosAbertos, setRadarFiltrosAbertos] = useState(false);
  const [amistosoLigado, setAmistosoLigado] = useState(viewerDisponivelAmistoso);
  const [showEntryPrompt] = useState(() => {
    if (typeof window === "undefined") return false;
    let skipPromptThisLoad = false;
    let declinedToday = false;
    try {
      const params = new URLSearchParams(window.location.search);
      skipPromptThisLoad = params.get("entry_done") === "1";
    } catch {
      skipPromptThisLoad = false;
    }
    try {
      declinedToday = window.localStorage.getItem(MATCH_AMISTOSO_ENTRY_DECLINED_DAY_KEY) === todayYmd();
    } catch {
      declinedToday = false;
    }
    return !skipPromptThisLoad && !viewerDisponivelAmistoso && !declinedToday;
  });
  const [showEntryInfo, setShowEntryInfo] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(MATCH_AMISTOSO_ENTRY_INFO_SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [entryError, setEntryError] = useState<string | null>(null);
  const [hideOwnerChallengeHint, setHideOwnerChallengeHint] = useState(false);
  const [mounted] = useState(() => typeof window !== "undefined");
  const syncUrl = useCallback(
    (next: { tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string; finalidade: MatchRadarFinalidade }) => {
      const q = new URLSearchParams();
      q.set("tipo", next.tipo);
      q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
      q.set("raio", String(next.raio));
      q.set("sort_by", next.sortBy);
      q.set("finalidade", next.finalidade);
      q.set("view", viewMode);
      q.set("genero", generoFiltro);
      window.history.replaceState(null, "", `/match?${q.toString()}`);
    },
    [viewMode, generoFiltro]
  );

  const runRefresh = useCallback(
    (next: { tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string; finalidade: MatchRadarFinalidade }) => {
      startTransition(async () => {
        const res = await refreshMatchRadarAction({
          tipo: next.tipo,
          sortBy: next.sortBy,
          raio: next.raio,
          esporteSelecionado: next.esporte,
          finalidade: next.finalidade,
        });
        if (res.ok) {
          setCards(res.cards);
        } else if (res.error === "no_maioridade") {
          const q = new URLSearchParams();
          q.set("tipo", next.tipo);
          q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
          q.set("raio", String(next.raio));
          q.set("sort_by", next.sortBy);
          q.set("finalidade", next.finalidade);
          const nextPath = `/match?${q.toString()}`;
          window.location.href = `/conta/confirmar-maioridade-match?next=${encodeURIComponent(nextPath)}`;
        }
      });
    },
    []
  );

  const runRefreshFull = useCallback(
    (next: { sortBy: SortBy; raio: number; esporte: string }) => {
      const ids = fullRadarFetchEsporteIds.filter((id) => /^\d+$/.test(id));
      if (ids.length === 0) return;

      startTransition(async () => {
        const resultsNested = await Promise.all(
          ids.map((eid) =>
            Promise.all([
              refreshMatchRadarAction({
                tipo: "atleta",
                sortBy: next.sortBy,
                raio: next.raio,
                esporteSelecionado: eid,
                finalidade: "ranking",
                includeActiveOpponents: true,
              }),
              refreshMatchRadarAction({
                tipo: "atleta",
                sortBy: next.sortBy,
                raio: next.raio,
                esporteSelecionado: eid,
                finalidade: "amistoso",
                includeActiveOpponents: true,
              }),
              refreshMatchRadarAction({
                tipo: "dupla",
                sortBy: next.sortBy,
                raio: next.raio,
                esporteSelecionado: eid,
                finalidade: "ranking",
                includeActiveOpponents: true,
              }),
              refreshMatchRadarAction({
                tipo: "time",
                sortBy: next.sortBy,
                raio: next.raio,
                esporteSelecionado: eid,
                finalidade: "ranking",
                includeActiveOpponents: true,
              }),
            ])
          )
        );
        const results = resultsNested.flat();

        const noMaioridade = results.some((r) => !r.ok && r.error === "no_maioridade");
        if (noMaioridade) {
          const q = new URLSearchParams();
          q.set("tipo", tipo);
          q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
          q.set("raio", String(next.raio));
          q.set("sort_by", next.sortBy);
          q.set("finalidade", finalidade);
          const nextPath = `/match?${q.toString()}`;
          window.location.href = `/conta/confirmar-maioridade-match?next=${encodeURIComponent(nextPath)}`;
          return;
        }

        const merged = results.flatMap((r) => (r.ok ? r.cards : []));
        const byKey = new Map<string, MatchRadarCard>();
        for (const card of merged) {
          const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
          const prev = byKey.get(key);
          if (!prev || (prev.interesseMatch !== "ranking_e_amistoso" && card.interesseMatch === "ranking_e_amistoso")) {
            byKey.set(key, card);
          }
        }
        setCards(Array.from(byKey.values()));
      });
    },
    [tipo, finalidade, fullRadarFetchEsporteIds]
  );

  const applyFilters = useCallback(
    (patch: Partial<{ tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string; finalidade: MatchRadarFinalidade }>) => {
      const nextFinalidade = patch.finalidade ?? finalidade;
      let nextTipo = patch.tipo ?? tipo;
      if (nextFinalidade === "amistoso" && nextTipo !== "atleta") {
        nextTipo = "atleta";
      }
      const next = {
        tipo: nextTipo,
        sortBy: patch.sortBy ?? sortBy,
        raio: patch.raio ?? raio,
        esporte: patch.esporte ?? esporte,
        finalidade: nextFinalidade,
      };
      setTipo(next.tipo);
      setSortBy(next.sortBy);
      setRaio(next.raio);
      setEsporte(next.esporte);
      setFinalidade(next.finalidade);
      syncUrl(next);
      if (viewMode === "full") runRefreshFull({ sortBy: next.sortBy, raio: next.raio, esporte: next.esporte });
      else runRefresh(next);
    },
    [tipo, sortBy, raio, esporte, finalidade, runRefresh, runRefreshFull, syncUrl, viewMode]
  );

  const esporteOptions = useMemo(() => {
    const allowed =
      tipo === "atleta"
        ? new Set(viewerEsportesIndividual.map(String))
        : tipo === "dupla"
          ? new Set(viewerEsportesComDupla.map(String))
          : new Set(viewerEsportesComTime.map(String));
    const list = esportes.filter((e) => allowed.has(String(e.id)));
    return [{ id: "all", nome: "Todos" }, ...list.map((e) => ({ id: String(e.id), nome: e.nome ?? "" }))];
  }, [esportes, tipo, viewerEsportesIndividual, viewerEsportesComDupla, viewerEsportesComTime]);

  useEffect(() => {
    if (esporte === "all") return;
    const ok = esporteOptions.some((o) => String(o.id) === String(esporte));
    if (!ok) applyFilters({ esporte: "all" });
  }, [tipo, esporte, esporteOptions, applyFilters]);

  const esporteNomeResumo = useMemo(() => {
    const row = esporteOptions.find((e) => String(e.id) === String(esporte));
    return row?.nome?.trim() || "Todos";
  }, [esporteOptions, esporte]);

  function switchViewMode(next: "full" | "grid") {
    setViewMode(next);
    const q = new URLSearchParams();
    q.set("tipo", tipo);
    q.set("esporte", /^\d+$/.test(esporte) ? esporte : "all");
    q.set("raio", String(raio));
    q.set("sort_by", sortBy);
    q.set("finalidade", finalidade);
    q.set("view", next);
    q.set("genero", generoFiltro);
    window.history.replaceState(null, "", `/match?${q.toString()}`);
    if (next === "full") {
      runRefreshFull({ sortBy, raio, esporte });
    }
  }

  async function handleEntryChoice(wantsAmistoso: boolean) {
    setEntryError(null);
    try {
      window.localStorage.setItem(MATCH_AMISTOSO_ENTRY_INFO_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowEntryInfo(false);
    switchViewMode("full");
    if (!wantsAmistoso) {
      try {
        window.localStorage.setItem(MATCH_AMISTOSO_ENTRY_DECLINED_DAY_KEY, todayYmd());
      } catch {
        /* ignore */
      }
      const q = new URLSearchParams();
      q.set("tipo", tipo);
      q.set("esporte", /^\d+$/.test(esporte) ? esporte : "all");
      q.set("raio", String(raio));
      q.set("sort_by", sortBy);
      q.set("finalidade", finalidade);
      q.set("view", "full");
      q.set("genero", generoFiltro);
      q.set("entry_done", "1");
      window.location.href = `/match?${q.toString()}`;
      return;
    }

    setEntryPending(true);
    const res = await setViewerDisponivelAmistoso(true);
    setEntryPending(false);
    if (!res.ok) {
      setEntryError("Não foi possível ativar o modo amistoso agora. Tente novamente.");
      return;
    }
    const q = new URLSearchParams();
    q.set("tipo", tipo);
    q.set("esporte", /^\d+$/.test(esporte) ? esporte : "all");
    q.set("raio", String(raio));
    q.set("sort_by", sortBy);
    q.set("finalidade", "ranking");
    q.set("view", "full");
    q.set("genero", generoFiltro);
    q.set("entry_done", "1");
    window.location.href = `/match?${q.toString()}`;
  }

  const isFullView = viewMode === "full";
  // Regra global do radar/desafio:
  // - Gênero só filtra no individual (atleta).
  // - Em dupla/time, nunca filtra por gênero.
  // - Em fullscreen, também não filtra por gênero.
  const generoFiltroEfetivo = isFullView || tipo !== "atleta" ? "all" : generoFiltro;
  const fullOrderedCards = useMemo(() => {
    type Bucket = "amistoso" | "ranking" | "dupla" | "time";
    const buckets: Record<Bucket, MatchRadarCard[]> = {
      amistoso: [],
      ranking: [],
      dupla: [],
      time: [],
    };

    for (const c of cards) {
      if (c.modalidade === "dupla") {
        buckets.dupla.push(c);
        continue;
      }
      if (c.modalidade === "time") {
        buckets.time.push(c);
        continue;
      }
      const isAmistosoCandidate = c.disponivelAmistoso && c.interesseMatch !== "ranking";
      if (isAmistosoCandidate) buckets.amistoso.push(c);
      else buckets.ranking.push(c);
    }

    const cycleOrder: Bucket[] = amistosoLigado
      ? ["amistoso", "ranking", "dupla", "time"]
      : ["ranking", "dupla", "time", "amistoso"];

    const pointers: Record<Bucket, number> = {
      amistoso: 0,
      ranking: 0,
      dupla: 0,
      time: 0,
    };
    const ordered: MatchRadarCard[] = [];

    while (true) {
      let addedThisRound = 0;
      for (const key of cycleOrder) {
        const start = pointers[key];
        const next = buckets[key].slice(start, start + 4);
        if (next.length > 0) {
          ordered.push(...next);
          pointers[key] = start + next.length;
          addedThisRound += next.length;
        }
      }
      if (addedThisRound === 0) break;
    }

    return ordered;
  }, [cards, amistosoLigado]);
  /** Tela cheia: um cartão por esporte/modalidade só se o viewer disputa aquele esporte naquela modalidade (espelha a regra do RPC). */
  const fullOrderedCardsPerfil = useMemo(() => {
    const ind = new Set(viewerEsportesIndividual);
    const dup = new Set(viewerEsportesComDupla);
    const tim = new Set(viewerEsportesComTime);
    return fullOrderedCards.filter((c) => {
      const sid = c.esporteId;
      if (!Number.isFinite(sid) || sid <= 0) return false;
      if (c.modalidade === "individual") return ind.has(sid);
      if (c.modalidade === "dupla") return dup.has(sid);
      if (c.modalidade === "time") return tim.has(sid);
      return false;
    });
  }, [fullOrderedCards, viewerEsportesIndividual, viewerEsportesComDupla, viewerEsportesComTime]);
  const cardsByGridFilters = useMemo(() => {
    return cards.filter((c) => {
      if (tipo === "atleta" && c.modalidade !== "individual") return false;
      if (tipo === "dupla" && c.modalidade !== "dupla") return false;
      if (tipo === "time" && c.modalidade !== "time") return false;
      if (finalidade === "amistoso" && c.modalidade !== "individual") return false;
      if (finalidade === "amistoso" && (!c.disponivelAmistoso || c.interesseMatch === "ranking")) return false;
      if (finalidade === "ranking" && c.interesseMatch === "amistoso") return false;
      return true;
    });
  }, [cards, tipo, finalidade]);
  const challengeableCards = useMemo(
    // Não escondemos cards de dupla/time por indisponibilidade momentânea de desafio.
    // O bloqueio fica no CTA/hint, mas o card deve aparecer na grade.
    () => cardsByGridFilters,
    [cardsByGridFilters]
  );
  const cardsFiltradosGeneroChallengeable = useMemo(() => {
    if (generoFiltroEfetivo === "all") return challengeableCards;
    return challengeableCards.filter((c) => {
      if (c.modalidade !== "individual") return true;
      const g = String(c.genero ?? "").trim().toLowerCase();
      if (generoFiltroEfetivo === "masculino") return g === "masculino";
      if (generoFiltroEfetivo === "feminino") return g === "feminino";
      return g !== "" && g !== "masculino" && g !== "feminino";
    });
  }, [challengeableCards, generoFiltroEfetivo]);
  const fullOrderedChallengeableCards = useMemo(() => {
    // No modo tela cheia, mostramos todas as modalidades; o chip de esporte só restringe a lista na UI.
    let ordered = fullOrderedCardsPerfil;
    if (isFullView && esporte !== "all" && /^\d+$/.test(String(esporte))) {
      const sid = Number(esporte);
      if (Number.isFinite(sid)) {
        ordered = fullOrderedCardsPerfil.filter((c) => c.esporteId === sid);
      }
    }
    return ordered;
  }, [fullOrderedCardsPerfil, isFullView, esporte]);
  const gridCardsWithoutDuplicates = useMemo(() => {
    const byKey = new Map<string, MatchRadarCard>();
    for (const card of cardsFiltradosGeneroChallengeable) {
      const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
      if (!byKey.has(key)) byKey.set(key, { ...card, groupedIndividualSports: undefined });
    }
    return Array.from(byKey.values());
  }, [cardsFiltradosGeneroChallengeable, tipo]);
  const visibleCards = isFullView ? fullOrderedChallengeableCards : gridCardsWithoutDuplicates;
  useEffect(() => {
    if (!isFullView) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullView]);

  return (
    <div
      className="w-full min-w-0"
      onClickCapture={() => {
        if (!hideOwnerChallengeHint) setHideOwnerChallengeHint(true);
      }}
    >
      {mounted && showEntryPrompt
        ? createPortal(
            <div
              className="fixed inset-0 flex items-end justify-center bg-black/55 px-2.5 pb-[calc(var(--eid-shell-footer-offset)+2.25rem)] pt-2.5 sm:items-center sm:p-4"
              style={{ zIndex: 800 }}
            >
              <div className="w-full max-w-md rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-3 shadow-[0_20px_40px_-22px_rgba(2,6,23,0.7)] sm:p-4">
                <p className="text-sm font-black text-eid-fg">Você quer jogar um amistoso hoje?</p>
                {showEntryInfo ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-eid-text-secondary">
                    Amistoso são jogos amigáveis que não somam pontos no ranking. Se quiser ficar disponível para jogos rápidos
                    com pessoas próximas, toque em <span className="font-semibold text-eid-primary-300">Sim</span>.
                  </p>
                ) : null}
                {entryError ? <p className="mt-1.5 text-[11px] text-red-300">{entryError}</p> : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleEntryChoice(true)}
                    disabled={entryPending}
                    className="eid-btn-match-cta inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 text-[12px] font-black uppercase tracking-[0.08em] disabled:opacity-55"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEntryChoice(false)}
                    disabled={entryPending}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-3 text-[12px] font-black uppercase tracking-[0.08em] text-eid-fg transition hover:border-eid-primary-500/35"
                  >
                    Não
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {!showEntryPrompt ? <MatchRankingRulesModal /> : null}
      {!isFullView ? (
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
                  onStateChange={setAmistosoLigado}
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
      ) : null}

      {!isFullView && showSentBanner ? (
        <p className="eid-match-surface-card mb-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-2.5 py-2 text-xs leading-snug text-eid-fg shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] backdrop-blur-sm">
          Pedido de desafio enviado. O adversário será notificado.
        </p>
      ) : null}

      {viewMode === "grid" ? (
        <div className={cn(matchFilterCardClass, "mt-1.5 mb-2")}>
          <div className={matchSectionHeadClass}>
            <h2 className={cn(matchSectionTitleClass, "inline-flex items-center gap-1.5")}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-eid-primary-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filtros do radar
            </h2>
            <div className="inline-flex items-center gap-1.5">
              <span className={matchBadgeGhostClass}>Radar</span>
              <EidSectionInfo sectionLabel="Como funcionam os filtros do radar">
                Tipo de desafio define se o confronto é de ranking ou amistoso. Modalidade seleciona individual, dupla ou
                time. Em Esporte você escolhe qual EID usar no confronto; Raio limita a distância em km; Ordenação alterna
                entre Nota EID e Pontos do ranking.
              </EidSectionInfo>
            </div>
          </div>
          <div className="space-y-2 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div>
          <p className={FILTER_LABEL}>Tipo de desafio</p>
          <div className="mt-0.5 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
            <nav
              className="flex min-h-[1.72rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)]"
              aria-label="Tipo de desafio"
            >
              {(
                [
                  ["ranking", "Desafio ranking"],
                  ["amistoso", "Desafio amistoso"],
                ] as const
              ).map(([value, label]) => {
                const active = finalidade === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    onClick={() => applyFilters({ finalidade: value })}
                    className={segmentTab(active, isPending)}
                  >
                    {value === "ranking" ? (
                      <Trophy className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    ) : (
                      <Handshake className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    )}
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div>
          <p className={FILTER_LABEL}>Modalidade</p>
          <div className="mt-0.5 rounded-md bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-0.5 backdrop-blur-sm sm:rounded-lg sm:p-1">
            <nav
              className="flex min-h-[1.72rem] overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] sm:rounded-md"
              aria-label="Modalidade"
            >
              {(
                [
                  ["atleta", "Individual"],
                  ["dupla", "Duplas"],
                  ["time", "Times"],
                ] as const
              ).map(([value, label]) => {
                const active = tipo === value;
                const bloqueadoAmistoso = finalidade === "amistoso" && value !== "atleta";
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending || bloqueadoAmistoso}
                    title={bloqueadoAmistoso ? "Desafio amistoso no radar é só no individual." : undefined}
                    onClick={() => applyFilters({ tipo: value })}
                    className={segmentTab(active, isPending)}
                  >
                    <ModalidadeGlyphIcon modalidade={value === "atleta" ? "individual" : value === "dupla" ? "dupla" : "time"} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_14%,transparent)] p-0.5 sm:rounded-lg sm:p-1">
          <button
            type="button"
            aria-expanded={radarFiltrosAbertos}
            aria-controls={MATCH_RADAR_FILTROS_PANEL_ID}
            disabled={isPending}
            onClick={() => setRadarFiltrosAbertos((v) => !v)}
            className="flex w-full min-w-0 touch-manipulation items-center gap-1.5 rounded-sm px-1 py-1 text-left transition hover:bg-eid-surface/30 disabled:opacity-50 sm:gap-2 sm:rounded-md sm:px-1.5 sm:py-1"
          >
            <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.12em] text-eid-primary-400">(Filtro)</span>
            <span className="min-w-0 flex-1 truncate text-[9px] font-bold uppercase leading-tight tracking-[0.04em] text-eid-fg/95">
              <span className="text-eid-text-secondary">Esporte</span>{" "}
              <span className="text-eid-fg/90">{esporteNomeResumo}</span>
              <span className="mx-1 font-normal text-eid-text-secondary">—</span>
              <span className="text-eid-text-secondary">Raio</span>{" "}
              <span className="text-eid-fg/90">{raio} km</span>
              <span className="mx-1 font-normal text-eid-text-secondary">—</span>
              <span className="text-eid-text-secondary">Ord.</span>{" "}
              <span className="text-eid-fg/90">{sortByLabelShort(sortBy)}</span>
            </span>
            <span className="shrink-0 text-[10px] text-eid-text-secondary" aria-hidden>
              {radarFiltrosAbertos ? "▾" : "▸"}
            </span>
          </button>

          {radarFiltrosAbertos ? (
            <div
              id={MATCH_RADAR_FILTROS_PANEL_ID}
              className="mt-1 space-y-1.5 border-t border-[color:var(--eid-border-subtle)]/55 pt-1.5"
            >
              <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
                <div className="min-w-0">
                  <p className={FILTER_LABEL}>Esporte</p>
                  <div className="mt-0.5 overflow-x-auto overflow-y-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] py-0.5 pl-0.5 pr-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:rounded-lg sm:py-1 sm:pl-1">
                    <div className="flex w-max flex-nowrap gap-0.5 pr-0.5 sm:gap-1 sm:pr-1">
                      {esporteOptions.map((e) => {
                        const active = String(esporte) === String(e.id);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            disabled={isPending}
                            onClick={() => applyFilters({ esporte: e.id === "all" ? "all" : e.id })}
                            className={cn(filterChip(active, isPending), "shrink-0")}
                          >
                            {e.nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={FILTER_LABEL}>Raio</p>
                  <div className="mt-0.5 flex flex-wrap gap-0.5 rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-0.5 sm:gap-1 sm:rounded-lg sm:p-1">
                    {RAII.map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={isPending}
                        onClick={() => applyFilters({ raio: r })}
                        className={filterChip(r === raio, isPending)}
                      >
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={FILTER_LABEL}>Ordenação</p>
                  <p className="mb-0.5 text-[7px] leading-tight text-eid-text-secondary sm:mb-1 sm:text-[8px] sm:leading-snug">
                    Ordem: <span className="font-semibold text-eid-fg/85">{sortByLabelShort(sortBy)}</span>. Padrão{" "}
                    <span className="font-semibold text-eid-fg/80">pontos do rank</span>; chip <span className="font-semibold text-eid-fg/80">Nota EID</span> para a média.
                  </p>
                  <div className="flex flex-wrap gap-0.5 rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-0.5 sm:gap-1 sm:rounded-lg sm:p-1">
                    {(
                      [
                        ["eid_score", "Nota EID"],
                        ["match_ranking_points", "Pontos rank"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        disabled={isPending}
                        onClick={() => applyFilters({ sortBy: k })}
                        className={filterChip(sortBy === k, isPending)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <p className={FILTER_LABEL}>Gênero</p>
          <div className="mt-0.5 flex flex-wrap gap-0.5 rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-0.5 sm:gap-1 sm:rounded-lg sm:p-1">
            {([
              ["all", "Todos"],
              ["masculino", "Masculino"],
              ["feminino", "Feminino"],
              ["outro", "Outros"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setGeneroFiltro(key);
                  const q = new URLSearchParams();
                  q.set("tipo", tipo);
                  q.set("esporte", /^\d+$/.test(esporte) ? esporte : "all");
                  q.set("raio", String(raio));
                  q.set("sort_by", sortBy);
                  q.set("finalidade", finalidade);
                  q.set("view", viewMode);
                  q.set("genero", key);
                  window.history.replaceState(null, "", `/match?${q.toString()}`);
                }}
                className={filterChip(generoFiltro === key, isPending)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
          </div>
        </div>
      ) : null}

      {!isFullView && isPending ? (
        <p className="mt-2 text-center text-[10px] font-medium text-eid-primary-400/90" aria-live="polite">
          Atualizando radar…
        </p>
      ) : null}

      <section className="mt-3" aria-busy={isPending}>
        {!isFullView ? (
          <div className={matchResultsCardClass}>
            <div className={matchSectionHeadClass}>
            <h2 className={cn(matchSectionTitleClass, "inline-flex items-center gap-1.5")}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-eid-primary-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M5 19V9M12 19V5M19 19v-8" />
              </svg>
              Resultados
            </h2>
              {viewMode === "grid" ? (
                <button
                  type="button"
                  disabled={visibleCards.length === 0}
                  onClick={() => switchViewMode("full")}
                  title={visibleCards.length === 0 ? "Sem sugestões para abrir em tela cheia" : "Abrir modo tela cheia"}
                  className={cn(
                    matchBadgeGhostClass,
                    "inline-flex h-[1.5rem] items-center gap-1 px-2 disabled:cursor-not-allowed disabled:opacity-45"
                  )}
                >
                  <Maximize2 className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                  Tela cheia
                </button>
              ) : null}
            </div>
            {finalidade === "amistoso" && amistosoLigado ? (
              <div className="border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-card)_90%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2 sm:px-4 sm:py-2.5">
                <MatchFriendlyToggle
                  initialOn={viewerDisponivelAmistoso}
                  initialExpiresAt={viewerAmistosoExpiresAt}
                  userId={viewerId}
                  className="!max-w-full"
                  onStateChange={setAmistosoLigado}
                />
              </div>
            ) : null}
            {visibleCards.length === 0 ? (
              <p className="eid-match-empty mx-3 mb-3 mt-1 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-6 text-center text-xs text-eid-text-secondary shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:mx-4">
                Nenhum oponente com esses filtros.
              </p>
            ) : (
              <div className="grid min-w-0 grid-cols-2 gap-1.5 px-2 pb-3 pt-2 sm:gap-3 sm:px-3 sm:pb-4">
                {visibleCards.map((c) => (
                  <MatchRadarGridStickerCard
                    key={`${c.modalidade}-${c.id}-${c.esporteId}`}
                    card={c}
                    esporteContextId={esporte}
                    viewerEsportesComDupla={viewerEsportesComDupla}
                    viewerEsportesComTime={viewerEsportesComTime}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
        {isFullView && finalidade === "amistoso" && amistosoLigado ? (
          <div className="mb-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-2 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.26)] sm:p-2.5">
            <MatchFriendlyToggle
              initialOn={viewerDisponivelAmistoso}
              initialExpiresAt={viewerAmistosoExpiresAt}
              userId={viewerId}
              className="!max-w-full"
              onStateChange={setAmistosoLigado}
            />
          </div>
        ) : null}
        {finalidade === "amistoso" && !amistosoLigado && mounted
          ? createPortal(
              <div className="fixed inset-0 z-[805] flex items-center justify-center bg-black/55 px-3">
                <div className="w-full max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-3 shadow-[0_16px_40px_-20px_rgba(2,6,23,0.78)] sm:p-4">
                  <p className="text-[11px] leading-snug text-eid-fg sm:text-xs">
                    Para funcionar no <span className="font-semibold text-eid-primary-300">modo amistoso</span>, ligue
                    sua disponibilidade. Sempre que quiser jogo rapido e amigavel, basta ativar para que usuarios
                    proximos possam te encontrar.
                  </p>
                  <div className="mt-2">
                    <MatchFriendlyToggle
                      initialOn={viewerDisponivelAmistoso}
                      initialExpiresAt={viewerAmistosoExpiresAt}
                      userId={viewerId}
                      className="!max-w-full"
                      onStateChange={setAmistosoLigado}
                    />
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
        {isFullView && visibleCards.length === 0 ? (
          <p className="eid-match-surface-card rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-4 text-center text-xs text-eid-text-secondary shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] backdrop-blur-sm">
            Nenhum oponente com esses filtros.
          </p>
        ) : null}
        {isFullView && visibleCards.length > 0 && mounted
          ? createPortal(<div
            className="fixed inset-0 isolate flex flex-col bg-eid-bg px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] sm:px-4"
            style={{ zIndex: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="Modo tela cheia de desafio"
          >
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-eid-primary-300 shadow-[0_8px_18px_-14px_rgba(37,99,235,0.58)]">
                  Modo tela cheia
                </span>
                <h2 className="mt-0.5 truncate bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_76%,var(--eid-fg)_24%))] bg-clip-text text-sm font-black tracking-[0.005em] text-transparent drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_26%,transparent)] sm:text-base">
                  Sugestões de desafios
                </h2>
                <p className="mt-0.5 truncate text-[9px] font-medium text-eid-text-secondary sm:text-[10px]">
                  Escolha um adversário e envie seu desafio em segundos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchViewMode("grid")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-fg transition hover:border-eid-primary-500/35 hover:bg-eid-surface"
                aria-label="Fechar modo tela cheia"
                title="Fechar"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto pb-2 sm:gap-2.5">
              {visibleCards.map((c) => {
                const esporteParam = c.esporteId > 0 ? String(c.esporteId) : esporte;
                const cardFinalidade =
                  c.modalidade !== "individual" ? "ranking" : c.interesseMatch === "amistoso" ? "amistoso" : "ranking";
                const desafioHref = `/desafio?id=${encodeURIComponent(c.id)}&tipo=${encodeURIComponent(c.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(cardFinalidade)}`;
                const nomeCurto = compactCardName(c.nome);
                const modalidadeLabel = c.modalidade === "individual" ? null : c.modalidade === "dupla" ? "Dupla" : "Time";
                const esporteIdStats = /^\d+$/.test(esporteParam) ? Number(esporteParam) : c.esporteId;
                const eidStatsHref =
                  esporteIdStats > 0
                    ? c.modalidade === "individual"
                      ? `/perfil/${encodeURIComponent(c.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
                      : `/perfil-time/${encodeURIComponent(c.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
                    : matchCardEidStatsHref(c);
                const avatarBlock = c.avatarUrl ? (
                  <Image
                    src={c.avatarUrl}
                    alt=""
                    fill
                    unoptimized
                    className={`h-full w-full ${PROFILE_PUBLIC_AVATAR_RING_CLASS} !object-cover object-center`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-surface text-[10px] font-black text-eid-primary-300">
                    EID
                  </div>
                );
                const avatarColumn = (
                  <div className="relative h-[5.1rem] w-[5.1rem] shrink-0">
                    <ProfileEditDrawerTrigger
                      href={eidStatsHref ?? c.href}
                      title={`Estatísticas EID de ${c.nome}`}
                      fullscreen
                      topMode="backOnly"
                      className="block h-[5.1rem] w-[5.1rem] overflow-hidden rounded-full border-2 border-orange-200/65 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] shadow-[0_0_0_4px_color-mix(in_srgb,var(--eid-surface)_86%,white_14%),0_10px_26px_-16px_rgba(239,108,0,0.55)]"
                    >
                      {avatarBlock}
                    </ProfileEditDrawerTrigger>
                    <span
                      className={`pointer-events-none absolute inset-0 rounded-full border-2 motion-safe:animate-pulse ${
                        c.disponivelAmistoso
                          ? "border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_0_12px_rgba(16,185,129,0.75)]"
                          : "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.45),0_0_12px_rgba(239,68,68,0.72)]"
                      }`}
                      aria-hidden
                    />
                    <div className="absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2">
                      {eidStatsHref ? (
                        <ProfileEditDrawerTrigger
                          href={eidStatsHref}
                          title={`Estatísticas EID de ${c.esporteNome} — ${c.nome}`}
                          fullscreen
                          topMode="backOnly"
                          className="inline-flex rounded-full"
                        >
                          <ProfileEidPerformanceSeal notaEid={c.eid} compact className="scale-[1.28]" />
                        </ProfileEditDrawerTrigger>
                      ) : (
                        <ProfileEidPerformanceSeal notaEid={c.eid} compact className="scale-[1.28]" />
                      )}
                    </div>
                  </div>
                );

                return (
                  <article
                    key={`${c.modalidade}-${c.id}-${c.esporteId}-mini`}
                    className="relative isolate overflow-hidden rounded-[1.6rem] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,white_18%)] bg-[radial-gradient(130%_100%_at_0%_0%,color-mix(in_srgb,var(--eid-primary-500)_7%,white_93%)_0%,transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_98%,white_2%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-3 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.45)] ring-1 ring-[color:color-mix(in_srgb,var(--eid-fg)_4%,transparent)]"
                  >
                    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                      <span className="absolute -left-8 -top-7 rotate-[-12deg] text-[88px] opacity-[0.03] blur-[0.2px]">⚽</span>
                      <span className="absolute -right-7 top-2 rotate-[16deg] text-[84px] opacity-[0.028] blur-[0.2px]">🎾</span>
                      <span className="absolute -left-6 bottom-1 rotate-[8deg] text-[92px] opacity-[0.026] blur-[0.2px]">🏀</span>
                      <span className="absolute -right-5 bottom-0 rotate-[-10deg] text-[80px] opacity-[0.024] blur-[0.2px]">🏸</span>
                    </div>
                    <div className="relative z-[1]">
                      <MatchRadarGridMiniChallengeBlock
                        card={c}
                        desafioHref={desafioHref}
                        nomeCurto={nomeCurto}
                        avatarColumn={avatarColumn}
                        esporteNome={c.esporteNome}
                        modalidadeLabel={modalidadeLabel}
                        viewerEsportesComDupla={viewerEsportesComDupla}
                        viewerEsportesComTime={viewerEsportesComTime}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="sticky bottom-0 z-[2] flex justify-center bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--eid-bg)_88%,transparent)_35%)] pb-1 pt-1">
              <button
                type="button"
                onClick={() => switchViewMode("grid")}
                className="inline-flex h-[1.05rem] items-center gap-0.5 rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-1.25 text-[6px] font-semibold uppercase tracking-[0.02em] text-eid-fg transition hover:border-eid-primary-500/35 hover:bg-eid-surface/75"
              >
                <Grid2x2 className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
                Modo grade
              </button>
            </div>
          </div>, document.body)
          : null}
      </section>

      {!isFullView ? (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] leading-relaxed text-eid-text-secondary">
          <span>
            O contexto do esporte vem do filtro{" "}
            <span className="font-semibold text-eid-fg/90">Esporte</span> acima. No{" "}
            <span className="font-semibold text-eid-fg/90">individual</span>, cada esporte do atleta no ranking aparece em
            um <span className="font-semibold text-eid-fg/90">cartão separado</span>, com resumo de vitórias, derrotas e
            posição quando disponível.
          </span>
          <EidSectionInfo sectionLabel="Informações do radar de desafio">
            O chip <span className="font-semibold text-eid-fg">Esporte</span> limita a lista ao confronto desejado (em{" "}
            <span className="font-semibold text-eid-fg">individual</span>, <span className="font-semibold text-eid-fg">dupla</span> ou{" "}
            <span className="font-semibold text-eid-fg">time</span> só entram esportes em que você disputa naquela modalidade).
            Cada combinação atleta + esporte no ranking individual gera um cartão próprio (sem agrupar dois esportes no mesmo
            cartão). Preferência de jogo e privacidade no{" "}
            <Link
              href="/conta/perfil"
              className="font-semibold text-eid-primary-400 underline-offset-2 transition hover:text-eid-primary-300 hover:underline"
            >
              perfil
            </Link>
            .
          </EidSectionInfo>
        </div>
      ) : null}
    </div>
  );
}
