"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Grid2x2, Handshake, Maximize2, Shield, Trophy, User, Users, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { refreshMatchRadarAction, setViewerDisponivelAmistoso } from "@/app/match/actions";
import type { EsporteConfrontoRow } from "@/lib/match/esportes-confronto";
import type { MatchRadarCard, MatchRadarFinalidade, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";
import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchRadarCardView } from "@/components/match/match-radar-card";
import { MatchChallengeAction } from "@/components/match/match-challenge-action";
import { MatchRankingRulesModal } from "@/components/match/match-ranking-rules-modal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import {
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_PUBLIC_AVATAR_RING_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { sportIconEmoji } from "@/lib/perfil/sport-icon-emoji";
import { matchCardEidStatsHref } from "@/lib/match/radar-snapshot";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function compactCardName(fullName: string) {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const firstAndLast = `${first} ${last}`.trim();
  return firstAndLast.length <= 18 ? firstAndLast : first;
}

function segmentTab(active: boolean) {
  return cn(
    "inline-flex min-w-0 flex-1 min-h-[1.5rem] touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] disabled:opacity-50",
    active
      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35"
  );
}

function filterChip(active: boolean) {
  return cn(
    "inline-flex h-[1.38rem] touch-manipulation items-center justify-center whitespace-nowrap rounded-md px-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ease-out motion-safe:transform-gpu active:scale-[0.985] disabled:opacity-50",
    active
      ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55"
  );
}

const FILTER_LABEL = "mb-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-eid-primary-400";

/** Cartão de filtros — alinhado ao ranking/dashboard. */
const matchFilterCardClass =
  "eid-match-filter-card overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)] [&_button]:[-webkit-tap-highlight-color:transparent]";

const matchSectionHeadClass =
  "eid-match-section-head flex items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const matchSectionTitleClass =
  "text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400";

const matchBadgeGhostClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]";

const matchResultsCardClass =
  "eid-match-results-card overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]";

type Props = {
  viewerId: string;
  initialCards: MatchRadarCard[];
  esportes: EsporteConfrontoRow[];
  /** Esporte efetivo da URL ou default do primeiro EID */
  esporteSelecionado: string;
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
  viewerHasDupla: boolean;
  viewerHasTime: boolean;
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
  esporteSelecionado,
  initialTipo,
  initialSortBy,
  initialRaio,
  initialFinalidade,
  initialView,
  initialGeneroFiltro,
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
  showSentBanner,
  viewerHasDupla,
  viewerHasTime,
}: Props) {
  const [tipo, setTipo] = useState<RadarTipo>(initialTipo);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [raio, setRaio] = useState(initialRaio);
  const [esporte, setEsporte] = useState(esporteSelecionado);
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
      runRefresh(next);
    },
    [tipo, sortBy, raio, esporte, finalidade, runRefresh, syncUrl]
  );


  const esporteOptions = useMemo(() => [{ id: "all", nome: "Todos" }, ...esportes.map((e) => ({ id: String(e.id), nome: e.nome ?? "" }))], [esportes]);

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
    () => cardsByGridFilters.filter((c) => c.modalidade === "individual" || c.canChallenge),
    [cardsByGridFilters]
  );
  const cardsFiltradosGeneroChallengeable = useMemo(() => {
    if (generoFiltro === "all") return challengeableCards;
    return challengeableCards.filter((c) => {
      if (c.modalidade !== "individual") return true;
      const g = String(c.genero ?? "").trim().toLowerCase();
      if (generoFiltro === "masculino") return g === "masculino";
      if (generoFiltro === "feminino") return g === "feminino";
      return g !== "" && g !== "masculino" && g !== "feminino";
    });
  }, [challengeableCards, generoFiltro]);
  const fullOrderedChallengeableCards = useMemo(() => {
    const allowed = new Set(challengeableCards.map((c) => `${c.modalidade}:${c.id}:${c.esporteId}`));
    return fullOrderedCards.filter((c) => allowed.has(`${c.modalidade}:${c.id}:${c.esporteId}`));
  }, [challengeableCards, fullOrderedCards]);
  const gridCardsWithoutDuplicates = useMemo(() => {
    const byKey = new Map<string, MatchRadarCard>();
    for (const card of cardsFiltradosGeneroChallengeable) {
      const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
      if (!byKey.has(key)) byKey.set(key, card);
    }
    return Array.from(byKey.values());
  }, [cardsFiltradosGeneroChallengeable]);
  const visibleCards = isFullView ? fullOrderedChallengeableCards : gridCardsWithoutDuplicates;
  const fullCardGroups = useMemo(() => {
    if (!isFullView) return [];
    const map = new Map<
      string,
      {
        key: string;
        base: MatchRadarCard;
        entries: MatchRadarCard[];
      }
    >();
    for (const card of visibleCards) {
      const key = `${card.modalidade}:${card.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.entries.push(card);
      } else {
        map.set(key, { key, base: card, entries: [card] });
      }
    }
    return Array.from(map.values()).map((group) => {
      const uniqueBySport = new Map<number, MatchRadarCard>();
      for (const entry of group.entries) {
        if (!uniqueBySport.has(entry.esporteId)) uniqueBySport.set(entry.esporteId, entry);
      }
      return {
        ...group,
        entries: Array.from(uniqueBySport.values()).sort((a, b) => {
          if (b.rank !== a.rank) return b.rank - a.rank;
          if (b.eid !== a.eid) return b.eid - a.eid;
          return a.esporteNome.localeCompare(b.esporteNome, "pt-BR");
        }),
      };
    });
  }, [isFullView, visibleCards]);

  useEffect(() => {
    if (!isFullView) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullView]);

  return (
    <div className="w-full min-w-0">
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
          <div className="relative z-[1] grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1.5 gap-y-0.5 sm:gap-x-2">
            <div className="col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center gap-0.75 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
                aria-hidden
              />
              <span className="truncate">Radar de oponentes</span>
            </div>
            <div className="col-start-2 row-start-1 row-span-2 flex shrink-0 flex-col items-end gap-1.5 justify-self-end">
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
            <h1 className="col-start-1 row-start-2 pt-1 text-[1.08rem] font-black leading-none tracking-[0.005em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:pt-1.5 sm:text-[1.28rem]">
              Desafio
            </h1>
            <p className="col-span-2 row-start-3 max-w-none pt-0.5 text-[9px] leading-snug text-eid-text-secondary text-balance sm:text-[10px]">
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
            <h2 className={matchSectionTitleClass}>Filtros do radar</h2>
            <span className={matchBadgeGhostClass}>Radar</span>
          </div>
          <div className="space-y-2 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div>
          <p className={FILTER_LABEL}>Tipo de desafio</p>
          <div className="mt-0.5 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
            <nav
              className="flex h-[1.5rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)]"
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
                    className={segmentTab(active)}
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
              className="flex h-[1.5rem] overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] sm:rounded-md"
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
                    className={segmentTab(active)}
                  >
                    {value === "atleta" ? (
                      <User className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    ) : value === "dupla" ? (
                      <Users className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    ) : (
                      <Shield className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    )}
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
                            className={cn(filterChip(active), "shrink-0")}
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
                        className={filterChip(r === raio)}
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
                        className={filterChip(sortBy === k)}
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
                className={filterChip(generoFiltro === key)}
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
              <h2 className={matchSectionTitleClass}>Resultados</h2>
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
              <div className="grid min-w-0 grid-cols-2 gap-1.5 px-2 pb-3 pt-2 max-[360px]:grid-cols-1 sm:gap-3 sm:px-3 sm:pb-4">
                {visibleCards.map((c) => (
                  <MatchRadarCardView
                    key={`${c.modalidade}-${c.id}-${c.esporteId}`}
                    card={c}
                    esporteContextId={esporte}
                    matchFinalidade={finalidade}
                    viewerHasDupla={viewerHasDupla}
                    viewerHasTime={viewerHasTime}
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
            <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto pb-2 max-[360px]:grid-cols-1 sm:gap-2.5">
              {fullCardGroups.map((group) => {
                const c = group.base;
                const esporteParam = c.esporteId > 0 ? String(c.esporteId) : esporte;
                const cardFinalidade =
                  c.modalidade !== "individual" ? "ranking" : c.interesseMatch === "amistoso" ? "amistoso" : "ranking";
                const desafioHref = `/desafio?id=${encodeURIComponent(c.id)}&tipo=${encodeURIComponent(c.modalidade)}&esporte=${encodeURIComponent(esporteParam)}&finalidade=${encodeURIComponent(cardFinalidade)}`;
                const nomeCurto = compactCardName(c.nome);
                const modalidadeLabel = c.modalidade === "individual" ? "Individual" : c.modalidade === "dupla" ? "Dupla" : "Time";
                const esporteIdStats = /^\d+$/.test(esporteParam) ? Number(esporteParam) : c.esporteId;
                const eidStatsHref =
                  esporteIdStats > 0
                    ? c.modalidade === "individual"
                      ? `/perfil/${encodeURIComponent(c.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
                      : c.modalidade === "dupla"
                        ? `/perfil-dupla/${encodeURIComponent(c.id)}/eid/${esporteIdStats}?from=${encodeURIComponent("/match")}`
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
                return (
                  <article
                    key={`${c.modalidade}-${c.id}-${c.esporteId}-mini`}
                    className="rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_86%,var(--eid-primary-500)_14%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-2.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.35)] ring-1 ring-[color:color-mix(in_srgb,var(--eid-fg)_5%,transparent)]"
                  >
                    <div className="flex items-start gap-2">
                      <div className="relative h-14 w-14 shrink-0">
                        <ProfileEditDrawerTrigger
                          href={eidStatsHref ?? c.href}
                          title={`Estatísticas EID de ${c.nome}`}
                          fullscreen
                          topMode="backOnly"
                          className="block h-14 w-14 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/65"
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
                              <ProfileEidPerformanceSeal notaEid={c.eid} compact className="scale-105" />
                            </ProfileEditDrawerTrigger>
                          ) : (
                            <ProfileEidPerformanceSeal notaEid={c.eid} compact className="scale-105" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-black text-eid-fg" title={c.nome}>
                          {nomeCurto}
                        </p>
                        <MatchChallengeAction
                          modalidade={c.modalidade}
                          desafioHref={desafioHref}
                          className="eid-btn-match-cta mt-1 inline-flex min-h-[20px] w-full items-center justify-center rounded-md px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.03em]"
                          title="Solicitar desafio"
                          viewerHasDupla={viewerHasDupla}
                          viewerHasTime={viewerHasTime}
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[8px] text-eid-text-secondary">{group.entries.length} esporte(s)</p>
                        <p className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-eid-text-secondary">
                          {c.modalidade === "individual" ? <User className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden /> : c.modalidade === "dupla" ? <Users className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden /> : <Shield className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden />}
                          Categoria: {modalidadeLabel}
                        </p>
                      </div>
                      <div className="space-y-1">
                        {group.entries.map((entry) => {
                          const esporteIcon = sportIconEmoji(entry.esporteNome);
                          const rowModalidade =
                            entry.modalidade === "individual" ? "Individual" : entry.modalidade === "dupla" ? "Dupla" : "Time";
                          return (
                            <div
                              key={`${group.key}-${entry.esporteId}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--eid-border-subtle)]/75 bg-eid-surface/45 px-2 py-1"
                            >
                              <p className="min-w-0 truncate text-[9px] font-semibold text-eid-primary-300">
                                {esporteIcon} {entry.esporteNome}
                              </p>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-1.5 py-0.5 text-[8px] font-bold text-eid-fg/90">
                                <Trophy className="h-2.5 w-2.5" strokeWidth={2.3} aria-hidden />
                                {entry.rank} pts
                                <span className="text-eid-text-secondary">-</span>
                                {rowModalidade}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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
      <p className="mt-4 text-center text-[10px] leading-relaxed text-eid-text-secondary">
        O esporte do confronto é o selecionado acima em <span className="font-semibold text-eid-fg/90">Esporte</span> (se
        você tem mais de um EID, troque o chip antes de solicitar). Preferência de jogo e privacidade no{" "}
        <Link
          href="/conta/perfil"
          className="font-semibold text-eid-primary-400 underline-offset-2 transition hover:text-eid-primary-300 hover:underline"
        >
          perfil
        </Link>
        .
      </p>
      ) : null}
    </div>
  );
}
