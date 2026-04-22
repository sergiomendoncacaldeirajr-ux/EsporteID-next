"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { refreshMatchRadarAction } from "@/app/match/actions";
import type { EsporteConfrontoRow } from "@/lib/match/esportes-confronto";
import type { MatchRadarCard, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";
import { MatchFriendlyToggle } from "@/components/match/match-friendly-toggle";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchRadarCardView } from "@/components/match/match-radar-card";
import { PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function segmentTab(active: boolean) {
  return cn(
    "inline-flex min-w-0 flex-1 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-sm px-1 py-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.035em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] disabled:opacity-50 sm:py-0 sm:text-[9px]",
    active
      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35"
  );
}

function filterChip(active: boolean) {
  return cn(
    "inline-flex touch-manipulation items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ease-out motion-safe:transform-gpu active:scale-[0.985] disabled:opacity-50",
    active
      ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55"
  );
}

const FILTER_CARD_CLASS =
  "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-2.5 backdrop-blur-sm shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)]";

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
        } else if (res.error === "no_maioridade") {
          const q = new URLSearchParams();
          q.set("tipo", next.tipo);
          q.set("esporte", /^\d+$/.test(next.esporte) ? next.esporte : "all");
          q.set("raio", String(next.raio));
          q.set("sort_by", next.sortBy);
          const nextPath = `/match?${q.toString()}`;
          window.location.href = `/conta/confirmar-maioridade-match?next=${encodeURIComponent(nextPath)}`;
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
    <div className="w-full min-w-0">
      <header className="mb-3 mt-0.5 space-y-3">
        <div>
          <div className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
              aria-hidden
            />
            Radar de oponentes
          </div>
          <h1 className="mt-1 text-[1.45rem] font-black tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.7rem]">
            Match
          </h1>
          <p className="mt-1 max-w-prose text-[11px] leading-relaxed text-eid-text-secondary sm:text-xs">
            Oponentes por proximidade; ordene por nota EID ou pontos do ranking. Troque modalidade e filtros sem recarregar.
          </p>
        </div>

        <MatchFriendlyToggle
          initialOn={viewerDisponivelAmistoso}
          initialExpiresAt={viewerAmistosoExpiresAt}
          userId={viewerId}
        />
      </header>

      {showSentBanner ? (
        <p className="mb-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 text-sm leading-snug text-eid-fg shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm">
          Pedido de match enviado. O adversário será notificado.
        </p>
      ) : null}

      <MatchLocationPrompt hasLocation />

      <div className="mb-3">
        <div className="space-y-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-2 backdrop-blur-sm shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] [&_button]:[-webkit-tap-highlight-color:transparent]">
          <p className={PROFILE_SECTION_TITLE}>Modalidade</p>
          <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
            <nav
              className="flex min-h-[2.25rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] sm:min-h-[1.5rem]"
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
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
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
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className={FILTER_CARD_CLASS}>
          <p className={cn(PROFILE_SECTION_TITLE, "mb-2")}>Esporte</p>
          <div className="flex max-h-[5.5rem] flex-wrap gap-1 overflow-y-auto rounded-lg bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-1.5">
            {esporteOptions.map((e) => {
              const active = String(esporte) === String(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => applyFilters({ esporte: e.id === "all" ? "all" : e.id })}
                  className={filterChip(active)}
                >
                  {e.nome}
                </button>
              );
            })}
          </div>
        </div>
        <div className={FILTER_CARD_CLASS}>
          <p className={cn(PROFILE_SECTION_TITLE, "mb-2")}>Raio</p>
          <div className="flex flex-wrap gap-1 rounded-lg bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-1.5">
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
      </div>

      <div className={cn(FILTER_CARD_CLASS, "mt-2")}>
        <p className={cn(PROFILE_SECTION_TITLE, "mb-2")}>Ordenação</p>
        <div className="flex flex-wrap gap-1 rounded-lg bg-[color-mix(in_srgb,var(--eid-bg)_18%,transparent)] p-1.5">
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

      {isPending ? (
        <p className="mt-3 text-center text-[11px] font-medium text-eid-primary-400/90" aria-live="polite">
          Atualizando radar…
        </p>
      ) : null}

      <section className="mt-4 space-y-2.5" aria-busy={isPending}>
        <h2 className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Resultados</h2>
        {cards.length === 0 ? (
          <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-6 text-center text-sm text-eid-text-secondary shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm">
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
