"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { refreshMatchRadarAction } from "@/app/match/actions";
import type { EsporteConfrontoRow } from "@/lib/match/esportes-confronto";
import type { MatchRadarCard, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";
import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchRadarCardView } from "@/components/match/match-radar-card";

type Props = {
  viewerId: string;
  initialCards: MatchRadarCard[];
  esportes: EsporteConfrontoRow[];
  /** Esporte efetivo da URL ou default do primeiro EID */
  esporteSelecionado: string;
  initialTipo: RadarTipo;
  initialSortBy: SortBy;
  initialRaio: number;
  viewerDisponivelAmistoso: boolean;
  /** ISO da janela de 4h quando o modo amistoso está ligado */
  viewerAmistosoExpiresAt: string | null;
  showSentBanner: boolean;
};

const RAII = [10, 30, 50, 100] as const;

export function MatchRadarApp({
  viewerId,
  initialCards,
  esportes,
  esporteSelecionado,
  initialTipo,
  initialSortBy,
  initialRaio,
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
  showSentBanner,
}: Props) {
  const [tipo, setTipo] = useState<RadarTipo>(initialTipo);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [raio, setRaio] = useState(initialRaio);
  const [esporte, setEsporte] = useState(esporteSelecionado);
  const [cards, setCards] = useState<MatchRadarCard[]>(initialCards);
  const [isPending, startTransition] = useTransition();

  const syncUrl = useCallback(
    (next: { tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string }) => {
      const q = new URLSearchParams();
      q.set("tipo", next.tipo);
      q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
      q.set("raio", String(next.raio));
      q.set("sort_by", next.sortBy);
      const path = `/match?${q.toString()}`;
      window.history.replaceState(null, "", path);
    },
    []
  );

  const runRefresh = useCallback(
    (next: { tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string }) => {
      startTransition(async () => {
        const res = await refreshMatchRadarAction({
          tipo: next.tipo,
          sortBy: next.sortBy,
          raio: next.raio,
          esporteSelecionado: next.esporte,
        });
        if (res.ok) {
          setCards(res.cards);
        }
      });
    },
    []
  );

  const applyFilters = useCallback(
    (patch: Partial<{ tipo: RadarTipo; sortBy: SortBy; raio: number; esporte: string }>) => {
      const next = {
        tipo: patch.tipo ?? tipo,
        sortBy: patch.sortBy ?? sortBy,
        raio: patch.raio ?? raio,
        esporte: patch.esporte ?? esporte,
      };
      setTipo(next.tipo);
      setSortBy(next.sortBy);
      setRaio(next.raio);
      setEsporte(next.esporte);
      syncUrl(next);
      runRefresh(next);
    },
    [tipo, sortBy, raio, esporte, runRefresh, syncUrl]
  );

  useEffect(() => {
    setTipo(initialTipo);
    setSortBy(initialSortBy);
    setRaio(initialRaio);
    setEsporte(esporteSelecionado);
    setCards(initialCards);
  }, [initialTipo, initialSortBy, initialRaio, esporteSelecionado, initialCards]);

  const esporteOptions = useMemo(() => [{ id: "all", nome: "Todos" }, ...esportes.map((e) => ({ id: String(e.id), nome: e.nome ?? "" }))], [esportes]);

  return (
    <div className="mx-auto w-full max-w-lg px-3 py-3 sm:max-w-2xl sm:px-4 sm:py-4">
      <header className="mb-3 space-y-3">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-eid-card via-eid-primary-950/30 to-eid-bg px-4 py-3 shadow-[0_12px_40px_-18px_rgba(34,211,238,0.25)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">Radar</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-eid-fg sm:text-2xl">Match</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary sm:text-xs">
            Oponentes por proximidade; depois EID ou pontos de rank. Troque aba e filtros sem recarregar a página.
          </p>
        </div>

        <MatchFriendlyToggle
          initialOn={viewerDisponivelAmistoso}
          initialExpiresAt={viewerAmistosoExpiresAt}
          userId={viewerId}
        />
      </header>

      {showSentBanner ? (
        <p className="mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-eid-fg">
          Pedido de Match enviado. O adversário será notificado.
        </p>
      ) : null}

      <MatchLocationPrompt hasLocation />

      <nav className="mt-3 flex gap-1 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-1" aria-label="Modalidade">
        {(
          [
            ["atleta", "Individual"],
            ["dupla", "Duplas"],
            ["time", "Times"],
          ] as const
        ).map(([value, label]) => {
          const active = tipo === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => applyFilters({ tipo: value })}
              className={`min-h-[40px] flex-1 rounded-xl text-center text-[11px] font-bold uppercase tracking-wide transition ${
                active ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40" : "text-eid-text-secondary hover:text-eid-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Esporte</p>
          <div className="flex max-h-[5.5rem] flex-wrap gap-1.5 overflow-y-auto">
            {esporteOptions.map((e) => {
              const active = String(esporte) === String(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => applyFilters({ esporte: e.id === "all" ? "all" : e.id })}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    active ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                  }`}
                >
                  {e.nome}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Raio</p>
          <div className="flex flex-wrap gap-1.5">
            {RAII.map((r) => (
              <button
                key={r}
                type="button"
                disabled={isPending}
                onClick={() => applyFilters({ raio: r })}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  r === raio ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-2.5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Ordenação técnica</p>
        <div className="flex flex-wrap gap-1.5">
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
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                sortBy === k ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <p className="mt-3 text-center text-[11px] text-cyan-300/80" aria-live="polite">
          Atualizando radar…
        </p>
      ) : null}

      <section className="mt-4 space-y-2.5" aria-busy={isPending}>
        {cards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/40 p-5 text-center text-sm text-eid-text-secondary">
            Nenhum oponente com esses filtros.
          </p>
        ) : (
          cards.map((c) => (
            <MatchRadarCardView key={`${c.modalidade}-${c.id}-${c.esporteId}`} card={c} esporteContextId={esporte} />
          ))
        )}
      </section>

      <p className="mt-6 text-center text-[10px] text-eid-text-secondary">
        Preferência de jogo e privacidade no{" "}
        <Link href="/conta/perfil" className="font-semibold text-cyan-400 underline-offset-2 hover:underline">
          perfil
        </Link>
        .
      </p>
    </div>
  );
}
