"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { refreshMatchRadarAction } from "@/app/match/actions";
import type { EsporteConfrontoRow } from "@/lib/match/esportes-confronto";
import type { MatchRadarCard, MatchRadarFinalidade, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";
import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchRadarCardView } from "@/components/match/match-radar-card";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function segmentTab(active: boolean) {
  return cn(
    "inline-flex min-w-0 flex-1 touch-manipulation items-center justify-center gap-0.5 whitespace-nowrap rounded-sm px-0.5 py-0.5 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] disabled:opacity-50 sm:px-1 sm:py-0.5 sm:text-[9px]",
    active
      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35"
  );
}

function filterChip(active: boolean) {
  return cn(
    "inline-flex touch-manipulation items-center justify-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[7px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ease-out motion-safe:transform-gpu active:scale-[0.985] disabled:opacity-50 sm:px-2 sm:text-[8px]",
    active
      ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55"
  );
}

const FILTER_CARD_CLASS =
  "rounded-lg border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-1.5 backdrop-blur-sm shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] sm:rounded-xl sm:p-2";

const FILTER_LABEL = "mb-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-eid-primary-400 sm:text-[8px] sm:tracking-[0.14em]";

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
  viewerDisponivelAmistoso: boolean;
  /** ISO da janela de 4h quando o modo amistoso está ligado */
  viewerAmistosoExpiresAt: string | null;
  showSentBanner: boolean;
};

const RAII = [10, 30, 50, 100] as const;

const MATCH_RADAR_FILTROS_PANEL_ID = "match-radar-filtros-esporte-raio-ord";

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
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
  showSentBanner,
}: Props) {
  const [tipo, setTipo] = useState<RadarTipo>(initialTipo);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [raio, setRaio] = useState(initialRaio);
  const [esporte, setEsporte] = useState(esporteSelecionado);
  const [finalidade, setFinalidade] = useState<MatchRadarFinalidade>(initialFinalidade);
  const [cards, setCards] = useState<MatchRadarCard[]>(initialCards);
  const [isPending, startTransition] = useTransition();
  const [radarFiltrosAbertos, setRadarFiltrosAbertos] = useState(false);

  const syncUrl = useCallback(
    (next: { tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string; finalidade: MatchRadarFinalidade }) => {
      const q = new URLSearchParams();
      q.set("tipo", next.tipo);
      q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
      q.set("raio", String(next.raio));
      q.set("sort_by", next.sortBy);
      q.set("finalidade", next.finalidade);
      window.history.replaceState(null, "", `/match?${q.toString()}`);
    },
    []
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

  useEffect(() => {
    setTipo(initialTipo);
    setSortBy(initialSortBy);
    setRaio(initialRaio);
    setEsporte(esporteSelecionado);
    setFinalidade(initialFinalidade);
    setCards(initialCards);
  }, [initialTipo, initialSortBy, initialRaio, esporteSelecionado, initialFinalidade, initialCards]);

  const esporteOptions = useMemo(() => [{ id: "all", nome: "Todos" }, ...esportes.map((e) => ({ id: String(e.id), nome: e.nome ?? "" }))], [esportes]);

  const esporteNomeResumo = useMemo(() => {
    const row = esporteOptions.find((e) => String(e.id) === String(esporte));
    return row?.nome?.trim() || "Todos";
  }, [esporteOptions, esporte]);

  return (
    <div className="w-full min-w-0">
      <header className="mb-2 mt-0">
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 sm:gap-x-3">
          <div className="col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
              aria-hidden
            />
            <span className="truncate">Radar de oponentes</span>
          </div>
          <div className="col-start-2 row-start-1 row-span-2 flex shrink-0 flex-col items-end gap-1 justify-self-end">
            <MatchLocationPrompt hasLocation />
            <MatchFriendlyToggle
              initialOn={viewerDisponivelAmistoso}
              initialExpiresAt={viewerAmistosoExpiresAt}
              userId={viewerId}
            />
          </div>
          <h1 className="col-start-1 row-start-2 pt-0.5 text-[1.35rem] font-black leading-none tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.6rem]">
            Match
          </h1>
          <p className="col-span-2 row-start-3 max-w-none pt-0.5 text-[10px] leading-snug text-eid-text-secondary text-balance sm:text-[11px]">
            {finalidade === "amistoso"
              ? "Atletas com modo amistoso ativo e interesse em jogo casual. O botão Solicitar match já envia pedido amistoso (sem carência de meses)."
              : "Oponentes por proximidade; ordene por nota EID ou pontos do ranking. Troque modalidade e filtros sem recarregar."}
          </p>
        </div>
      </header>

      {showSentBanner ? (
        <p className="mb-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-2.5 py-2 text-xs leading-snug text-eid-fg shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] backdrop-blur-sm">
          Pedido de match enviado. O adversário será notificado.
        </p>
      ) : null}

      <div className={cn(FILTER_CARD_CLASS, "mb-2 space-y-2 [&_button]:[-webkit-tap-highlight-color:transparent]")}>
        <div>
          <p className={FILTER_LABEL}>Tipo de match</p>
          <div className="mt-1 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
            <nav
              className="flex min-h-[2rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] sm:min-h-[1.5rem]"
              aria-label="Tipo de match"
            >
              {(
                [
                  ["ranking", "Match ranking"],
                  ["amistoso", "Match amistoso"],
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
                    {label}
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
              className="flex min-h-[1.65rem] overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] sm:min-h-[1.4rem] sm:rounded-md"
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
                    title={bloqueadoAmistoso ? "Match amistoso no radar é só no individual." : undefined}
                    onClick={() => applyFilters({ tipo: value })}
                    className={segmentTab(active)}
                  >
                    {label}
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
      </div>

      {isPending ? (
        <p className="mt-2 text-center text-[10px] font-medium text-eid-primary-400/90" aria-live="polite">
          Atualizando radar…
        </p>
      ) : null}

      <section className="mt-3" aria-busy={isPending}>
        <h2 className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Resultados</h2>
        {cards.length === 0 ? (
          <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-4 text-center text-xs text-eid-text-secondary shadow-[0_6px_16px_-12px_rgba(15,23,42,0.22)] backdrop-blur-sm">
            Nenhum oponente com esses filtros.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 min-[480px]:gap-2.5 sm:gap-3">
            {cards.map((c) => (
              <MatchRadarCardView
                key={`${c.modalidade}-${c.id}-${c.esporteId}`}
                card={c}
                esporteContextId={esporte}
                matchFinalidade={finalidade}
              />
            ))}
          </div>
        )}
      </section>

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
    </div>
  );
}
