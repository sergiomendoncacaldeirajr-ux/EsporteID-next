import Link from "next/link";
import type { ReactNode } from "react";
import type { RankingSearchState } from "@/lib/ranking/ranking-href";
import { rankingHref } from "@/lib/ranking/ranking-href";
import CityGpsLabel from "@/components/ranking/city-gps-label";
import { EidSealPill } from "@/components/ui/eid-seal-pill";
import { SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function IconCrown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#F4A300" d="M5 16.6h14l-1.3-6.5-3.5 3.1L12 7.1l-2.2 6.1-3.5-3.1L5 16.6Z" />
      <rect x="4.7" y="17.4" width="14.6" height="1.7" rx="0.85" fill="#F4A300" />
      <circle cx="6.3" cy="8.8" r="1.05" fill="#F4A300" />
      <circle cx="12" cy="5.6" r="1.05" fill="#F4A300" />
      <circle cx="17.7" cy="8.8" r="1.05" fill="#F4A300" />
    </svg>
  );
}

function IconSingle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M6.75 18.5a5.25 5.25 0 0 1 10.5 0" />
    </svg>
  );
}

function IconDouble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="9" cy="8.25" r="2.5" />
      <circle cx="15.4" cy="9" r="2.2" />
      <path d="M4.75 18a4.2 4.2 0 0 1 8.4 0" />
      <path d="M12.7 18.2a3.55 3.55 0 0 1 5.9-2.6" />
    </svg>
  );
}

function IconTeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="12" cy="7.8" r="2.6" />
      <circle cx="6.8" cy="10" r="2.1" />
      <circle cx="17.2" cy="10" r="2.1" />
      <path d="M7 18.5a5 5 0 0 1 10 0" />
      <path d="M2.8 18.5a3.7 3.7 0 0 1 3.9-3.2" />
      <path d="M17.3 15.3a3.7 3.7 0 0 1 3.9 3.2" />
    </svg>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M12 21s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.3" />
    </svg>
  );
}

function IconBrazil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="4.2" y="5" width="15.6" height="14" rx="2.2" />
      <path d="M12 8.1l4.2 3-4.2 3-4.2-3 4.2-3z" />
      <circle cx="12" cy="11.1" r="1.2" />
    </svg>
  );
}

type FilterBarProps = {
  state: RankingSearchState;
  principalEsporteId: number | null;
  selectedEsporteId: number | null;
  cidadeDisplay: string | null;
  needsCidadeFallback: boolean;
  todosEsportes: { id: number; nome: string }[];
};

/** Barra de filtros em chips (sem rótulos de seção); esportes em scroll horizontal. */
export function RankingFilterBar({
  state,
  principalEsporteId,
  selectedEsporteId,
  cidadeDisplay,
  needsCidadeFallback,
  todosEsportes,
}: FilterBarProps) {
  const pe = principalEsporteId;
  const href = (next: Parameters<typeof rankingHref>[0]) => rankingHref(next, state, pe);
  const clearHref = rankingHref(
    { tipo: "individual", local: "cidade", esporte: "", rank: "match", periodo: "ano", page: 1 },
    state,
    pe
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_95%,transparent)] [&_a]:[-webkit-tap-highlight-color:transparent]">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-4 py-2.5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-eid-fg">Filtros</h3>
        <Link
          href={clearHref}
          className="inline-flex h-6 items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_72%,var(--eid-bg)_28%)] px-2 text-[7px] font-black uppercase tracking-[0.05em] text-eid-primary-400"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M8 12h8M10 18h4" strokeLinecap="round" />
          </svg>
          Limpar
        </Link>
      </div>

      <div className="space-y-2 p-2.5">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_78%,var(--eid-bg)_22%)] p-1">
          <div className="grid grid-cols-3 gap-1">
            <Link href={href({ tipo: "individual", page: 1 })} className={tipoSegmentButton(state.tipo === "individual")}>
              <IconSingle className="h-4 w-4 shrink-0" />
              <span>Individual</span>
            </Link>
            <Link href={href({ tipo: "dupla", page: 1 })} className={tipoSegmentButton(state.tipo === "dupla")}>
              <IconDouble className="h-4 w-4 shrink-0" />
              <span>Duplas</span>
            </Link>
            <Link href={href({ tipo: "time", page: 1 })} className={tipoSegmentButton(state.tipo === "time")}>
              <IconTeam className="h-4 w-4 shrink-0" />
              <span>Times</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_78%,var(--eid-bg)_22%)] p-1">
          <Link href={href({ local: "cidade", page: 1 })} className={blockButton(state.local === "cidade")}>
            <IconPin className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              <CityGpsLabel fallbackCity={cidadeDisplay} />
            </span>
          </Link>
          <Link href={href({ local: "brasil", page: 1 })} className={blockButton(state.local === "brasil")}>
            <IconBrazil className="h-4 w-4 shrink-0" />
            <span className="truncate">Brasil</span>
          </Link>
        </div>
        {needsCidadeFallback ? (
          <p className="px-0.5 text-xs leading-snug text-eid-text-secondary">
            Sem cidade —{" "}
            <Link
              href="/conta/perfil"
              className="font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)] underline-offset-2 hover:underline"
            >
              perfil
            </Link>
          </p>
        ) : null}

        {todosEsportes.length > 0 ? (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_78%,var(--eid-bg)_22%)] p-1.5">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth whitespace-nowrap pb-0.5 pr-0.5 select-none [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max flex-nowrap items-center gap-1.5">
              {todosEsportes.map((opt) => {
                const active = selectedEsporteId === opt.id;
                const isPrincipal = principalEsporteId != null && opt.id === principalEsporteId;
                return (
                  <Link
                    key={opt.id}
                    href={href({ esporte: opt.id === principalEsporteId ? "" : String(opt.id), page: 1 })}
                    title={isPrincipal ? "Esporte principal do perfil" : undefined}
                    className={cn(
                      "inline-flex h-7 w-auto shrink-0 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 text-[7px] font-black uppercase leading-none tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985]",
                      active
                        ? "eid-ranking-sport-pill-active bg-eid-primary-500/16 text-eid-primary-300 shadow-[0_6px_14px_-10px_rgba(37,99,235,0.35)]"
                        : "bg-[color:color-mix(in_srgb,var(--eid-card)_76%,var(--eid-surface)_24%)] text-eid-text-secondary hover:bg-eid-surface/55",
                      isPrincipal && !active && "bg-eid-primary-500/08 text-eid-fg/90"
                    )}
                  >
                    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      <SportGlyphIcon sportName={opt.nome} />
                    </span>
                    <span>{opt.nome}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_76%,var(--eid-surface)_24%)] text-eid-text-secondary"
                aria-label="Mais esportes"
              >
                +
              </button>
            </div>
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}

export function RankingPeriodToggle({
  state,
  principalEsporteId,
}: {
  state: RankingSearchState;
  principalEsporteId: number | null;
}) {
  const href = (next: Parameters<typeof rankingHref>[0]) => rankingHref(next, state, principalEsporteId);
  return (
    <div className="flex justify-end">
      <div className="eid-ranking-toggle-shell relative flex h-[1.3rem] min-w-[6rem] overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] p-0.5 text-[8px] backdrop-blur-sm [&_a]:[-webkit-tap-highlight-color:transparent]">
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0.5 z-0 w-[calc(50%-2px)] rounded-full border border-eid-primary-500/30 bg-eid-primary-500/14 shadow-[0_6px_12px_-9px_rgba(37,99,235,0.5)] transition-transform duration-200",
            state.periodo === "mes" ? "translate-x-[calc(100%+1px)]" : "translate-x-0"
          )}
          aria-hidden
        />
        <Link
          href={href({ periodo: "ano", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-full min-w-0 flex-1 touch-manipulation items-center justify-center whitespace-nowrap rounded-full px-1 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] cursor-pointer",
            state.periodo === "ano"
              ? "text-eid-fg"
              : "text-eid-text-secondary hover:bg-white/[0.03]"
          )}
        >
          Ano
        </Link>
        <Link
          href={href({ periodo: "mes", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-full min-w-0 flex-1 touch-manipulation items-center justify-center whitespace-nowrap rounded-full px-1 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] cursor-pointer",
            state.periodo === "mes"
              ? "text-eid-fg"
              : "text-eid-text-secondary hover:bg-white/[0.03]"
          )}
        >
          Mês
        </Link>
      </div>
    </div>
  );
}

export function RankingRankToggle({
  state,
  principalEsporteId,
}: {
  state: RankingSearchState;
  principalEsporteId: number | null;
}) {
  const href = (next: Parameters<typeof rankingHref>[0]) => rankingHref(next, state, principalEsporteId);
  const rankIsMatch = state.rank === "match";
  return (
    <div className="flex justify-start">
      <div className="eid-ranking-toggle-shell relative flex h-[1.3rem] min-w-[6rem] overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] p-0.5 text-[8px] backdrop-blur-sm [&_a]:[-webkit-tap-highlight-color:transparent]">
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0.5 z-0 w-[calc(50%-2px)] rounded-full border border-eid-primary-500/30 bg-eid-primary-500/14 shadow-[0_6px_12px_-9px_rgba(37,99,235,0.5)] transition-transform duration-200",
            rankIsMatch ? "translate-x-0" : "translate-x-[calc(100%+1px)]"
          )}
          aria-hidden
        />
        <Link
          href={href({ rank: "match", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-full min-w-0 flex-1 touch-manipulation items-center justify-center whitespace-nowrap rounded-full px-1 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] cursor-pointer",
            rankIsMatch
              ? "text-eid-fg"
              : "text-eid-text-secondary hover:bg-white/[0.03]"
          )}
        >
          Desafio
        </Link>
        <Link
          href={href({ rank: "eid", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-full min-w-0 flex-1 touch-manipulation items-center justify-center whitespace-nowrap rounded-full px-1 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985] cursor-pointer",
            !rankIsMatch
              ? "text-eid-fg"
              : "text-eid-text-secondary hover:bg-white/[0.03]"
          )}
        >
          EID
        </Link>
      </div>
    </div>
  );
}

function tipoSegmentButton(active: boolean) {
  return cn(
    "inline-flex h-[30px] min-w-0 flex-1 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 text-[6.5px] font-black uppercase leading-none tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985]",
    active
      ? "eid-ranking-chip-active bg-[color-mix(in_srgb,var(--eid-primary-500)_24%,var(--eid-card)_76%)] text-eid-primary-300 shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35"
  );
}

function blockButton(active: boolean) {
  return cn(
    "inline-flex h-[30px] w-auto min-w-0 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 text-[6.5px] font-black uppercase leading-none tracking-[0.03em] transition-all duration-250 ease-out motion-safe:transform-gpu active:translate-y-[0.5px] active:scale-[0.985]",
    active
      ? "eid-ranking-chip-active bg-eid-primary-500/14 text-eid-primary-500 shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55"
  );
}

/** Selo EID sobre a borda inferior do avatar. */
export function RankingEidSeal({ score, compact = false }: { score: number; compact?: boolean }) {
  const safe = Number.isFinite(score) ? score : 0;
  return (
    <EidSealPill
      value={safe}
      variant={compact ? "ranking-tight" : "ranking"}
      aria-hidden
      className={cn(
        "eid-ranking-eid-seal pointer-events-none absolute bottom-0 left-1/2 z-[3] -translate-x-1/2",
        compact ? "translate-y-[24%]" : "translate-y-[18%] scale-[1.08]"
      )}
    />
  );
}

export type PodiumSlot = {
  place: string;
  nome: string;
  avatarUrl: string | null;
  notaEid: number;
  pontos: number;
  href: string;
};

export function RankingPodium({
  second,
  first,
  third,
  rankKind = "match",
  rankToggle,
  periodToggle,
}: {
  second: PodiumSlot | null;
  first: PodiumSlot | null;
  third: PodiumSlot | null;
  /** Métrica exibida no pódio: pontos (match) ou nota EID. */
  rankKind?: "match" | "eid";
  rankToggle?: ReactNode;
  periodToggle?: ReactNode;
}) {
  const hasAnyPodium = !!(first || second || third);
  if (!hasAnyPodium && !periodToggle && !rankToggle) return null;

  return (
    <section className="relative z-[1] mb-0.5 isolate">
      <div className="eid-podium-card overflow-visible rounded-[1.65rem] border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_95%,var(--eid-surface)_5%)] px-3 py-3.5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.25)] backdrop-blur-sm [&_a]:[-webkit-tap-highlight-color:transparent]">
        {rankToggle || periodToggle ? (
          <div className="relative z-[3] mb-1 grid grid-cols-2 items-start gap-2">
            <div className="min-w-0 w-fit flex flex-col items-start">
              <p className="eid-ranking-podium-label mb-1 w-full text-left text-[10px] font-black uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]">
                Tipo de rank
              </p>
              {rankToggle}
            </div>
            <div className="ml-auto min-w-0 w-fit flex flex-col items-end">
              <p className="eid-ranking-podium-label mb-1 w-full text-right text-[10px] font-black uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]">
                Período
              </p>
              {periodToggle}
            </div>
          </div>
        ) : null}
        <h2 className="pointer-events-none eid-podium-title -mt-4 mb-2.5 text-center text-[11px] font-black uppercase tracking-[0.16em] text-eid-primary-500">
          Pódio
        </h2>
        {hasAnyPodium ? (
          <div className="relative mx-auto w-full max-w-[46rem]">
            <div className="pointer-events-none absolute left-1/3 top-[6.55rem] hidden h-[5.15rem] w-px -translate-x-1/2 bg-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,transparent)] sm:block" />
            <div className="pointer-events-none absolute left-2/3 top-[6.55rem] hidden h-[5.15rem] w-px -translate-x-1/2 bg-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,transparent)] sm:block" />
            <div className="grid w-full grid-cols-3 items-end gap-1 sm:gap-2">
            <div className="relative min-h-[1px]">
              {second ? <PodiumFace slot={second} highlight={false} rankKind={rankKind} /> : null}
            </div>
            <div className="z-10 -translate-y-1">
              {first ? <PodiumFace slot={first} highlight rankKind={rankKind} /> : null}
            </div>
            <div className="relative min-h-[1px]">
              {third ? <PodiumFace slot={third} highlight={false} rankKind={rankKind} /> : null}
            </div>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-eid-text-secondary">Sem pódio para o período selecionado.</p>
        )}
      </div>
    </section>
  );
}

function PodiumFace({ slot, highlight, rankKind }: { slot: PodiumSlot; highlight: boolean; rankKind: "match" | "eid" }) {
  const initial = (slot.nome.trim().slice(0, 2) || "—").toUpperCase();
  const placeTone =
    slot.place === "1º"
      ? "border-[#FFD700]/90 shadow-[0_0_18px_-7px_rgba(255,215,0,0.6)]"
      : slot.place === "2º"
        ? "border-[#C0C0C0]/90 shadow-[0_0_16px_-7px_rgba(192,192,192,0.55)]"
        : "border-[#CD7F32]/90 shadow-[0_0_16px_-7px_rgba(205,127,50,0.55)]";
  const avatarClass = cn(
    "relative mx-auto shrink-0 overflow-hidden rounded-full",
    highlight
      ? "h-[3.45rem] w-[3.45rem] border-[1.5px]"
      : "h-[2.65rem] w-[2.65rem] border-[1.5px]",
    placeTone,
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-white/4 before:opacity-70 before:animate-[pulse_2.8s_ease-in-out_infinite]"
  );
  return (
    <div className={cn("flex flex-col items-center text-center", highlight && "scale-[1.03]")}>
      <span className="mb-0.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-1 py-px text-[8px] font-black tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_66%,var(--eid-primary-500)_34%)]">
        {slot.place}
      </span>
      {highlight ? (
        <div className="eid-ranking-crown mb-0.5 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.18))]" aria-hidden>
          <IconCrown className="mx-auto h-4 w-4" />
        </div>
      ) : (
        <div className="mb-0.5 h-2.5" aria-hidden />
      )}
      <Link
        href={slot.href}
        className="group relative flex flex-col items-center transition-transform duration-200 ease-out motion-safe:transform-gpu hover:scale-[1.02] active:scale-[0.98] outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
        aria-label={`Perfil de ${slot.nome}`}
      >
        <div className="relative pb-1.5">
          <div className={avatarClass}>
            {slot.avatarUrl ? (
              <img src={slot.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[7px] font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                {initial}
              </div>
            )}
          </div>
          {rankKind === "match" ? <RankingEidSeal score={slot.notaEid} /> : null}
        </div>
      </Link>
      <p className="mt-1.5 line-clamp-2 max-w-[10rem] px-0.5 text-[10px] font-extrabold leading-tight text-eid-fg">
        {slot.nome}
      </p>
      <p className="mt-0.5 text-[11px] font-black tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)]">
        {rankKind === "eid" ? (
          <>
            {(Number.isFinite(slot.notaEid) ? slot.notaEid : 0).toFixed(1)}{" "}
            <span className="text-[7px] font-bold uppercase tracking-wide text-eid-text-secondary">EID</span>
          </>
        ) : (
          <>
            {slot.pontos}{" "}
            <span className="text-[7px] font-bold uppercase tracking-wide text-eid-text-secondary">PTS</span>
          </>
        )}
      </p>
    </div>
  );
}

export function RankingRow({
  rank,
  nome,
  metricValue,
  metricKind,
  eidScore,
  vitorias,
  derrotas,
  rankDelta,
  avatarUrl,
  href,
}: {
  rank: number;
  nome: string;
  metricValue: number;
  metricKind: "pontos" | "eid";
  eidScore: number;
  vitorias?: number | null;
  derrotas?: number | null;
  rankDelta?: number | null;
  avatarUrl: string | null;
  href: string;
}) {
  const initial = (nome.trim().slice(0, 2) || "—").toUpperCase();
  const valueText = metricKind === "eid" ? metricValue.toFixed(1) : String(metricValue);
  const wins = Number.isFinite(vitorias) ? Number(vitorias) : 0;
  const losses = Number.isFinite(derrotas) ? Number(derrotas) : 0;
  const perfDelta = wins - losses;
  const delta = Number.isFinite(rankDelta as number) ? Number(rankDelta) : perfDelta;
  const showWDL = vitorias != null || derrotas != null;
  return (
    <div className="eid-ranking-row flex items-center gap-2.5 border-b border-[color:var(--eid-border-subtle)] py-2 last:border-b-0 sm:py-2.5">
      <span className="eid-ranking-rank-num w-8 shrink-0 text-center text-[16px] font-black tabular-nums leading-none text-[color:color-mix(in_srgb,var(--eid-fg)_48%,var(--eid-primary-500)_52%)] sm:text-[18px]">
        {rank}º
      </span>
      <Link
        href={href}
        className="group relative h-8 w-8 shrink-0 transition-transform duration-200 ease-out motion-safe:transform-gpu hover:scale-[1.03] active:scale-[0.97] outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500 sm:h-9 sm:w-9"
        aria-label={`Perfil de ${nome}`}
      >
        <div className="relative pb-1">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] transition group-hover:border-eid-primary-500/35 sm:h-9 sm:w-9">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[7px] font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                {initial}
              </div>
            )}
          </div>
          <RankingEidSeal score={eidScore} compact />
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold leading-tight text-eid-fg sm:text-[12px]">{nome}</p>
        {showWDL ? (
          <p className="mt-0.5 text-[9px] font-black leading-none">
            <span className="text-emerald-600">{wins}V</span>{" "}
            <span className="text-rose-500">{losses}D</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-end gap-2">
        <p className="text-[16px] font-black tabular-nums leading-none text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] sm:text-[18px]">
          {valueText}
          <span className="ml-1 text-[8px] font-bold uppercase tracking-wide text-eid-text-secondary sm:text-[9px]">{metricKind === "eid" ? "EID" : "PTS"}</span>
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 pb-[1px] text-[9px] font-black tabular-nums leading-none",
            delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-500" : "text-eid-text-secondary"
          )}
          aria-label={delta > 0 ? `Subiu ${delta}` : delta < 0 ? `Desceu ${Math.abs(delta)}` : "Sem variação"}
        >
          {delta === 0 ? (
            <span className="inline-block h-0.5 w-2.5 rounded-full bg-current" aria-hidden />
          ) : (
            <span aria-hidden>{delta > 0 ? "▲" : "▼"}</span>
          )}
          <span>{Math.abs(delta)}</span>
        </span>
      </div>
    </div>
  );
}

export function ViewerRankCard({ rank }: { rank: number }) {
  return (
    <div className="eid-ranking-viewer-card mb-2 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/[0.08] px-3 py-2 text-center shadow-[0_8px_20px_-14px_rgba(37,99,235,0.35)]">
      <p className="text-[11px] text-eid-text-secondary md:text-xs">
        Sua posição:{" "}
        <span className="text-base font-black tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
          {rank}º
        </span>
      </p>
    </div>
  );
}
