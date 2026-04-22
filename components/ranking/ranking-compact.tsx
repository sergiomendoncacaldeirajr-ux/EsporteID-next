import Link from "next/link";
import type { ReactNode } from "react";
import type { RankingSearchState } from "@/lib/ranking/ranking-href";
import { rankingHref } from "@/lib/ranking/ranking-href";
import CityGpsLabel from "@/components/ranking/city-gps-label";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function IconCrown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5 16L3 7l5.5 3L12 4l3.5 6L21 7l-2 9H5zm2.65 2h8.7l.45 2H7.2l.45-2z" />
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

function IconSport({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="12" cy="12" r="7.2" />
      <path d="M12 4.8v14.4M4.8 12h14.4" />
      <path d="M7.4 7.4c1.5 1.4 2.2 2.9 2.2 4.6s-.7 3.2-2.2 4.6" />
      <path d="M16.6 7.4c-1.5 1.4-2.2 2.9-2.2 4.6s.7 3.2 2.2 4.6" />
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

  return (
    <div className="mb-3">
      <div className="space-y-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-2 backdrop-blur-sm shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] [&_a]:[-webkit-tap-highlight-color:transparent]">
        <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
          <div className="flex h-[1.5rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)]">
            <Link href={href({ tipo: "individual", page: 1 })} className={tipoSegmentButton(state.tipo === "individual")}>
              <IconSingle className="h-2.5 w-2.5 shrink-0" />
              <span>Individual</span>
            </Link>
            <Link href={href({ tipo: "dupla", page: 1 })} className={tipoSegmentButton(state.tipo === "dupla")}>
              <IconDouble className="h-2.5 w-2.5 shrink-0" />
              <span>Duplas</span>
            </Link>
            <Link href={href({ tipo: "time", page: 1 })} className={tipoSegmentButton(state.tipo === "time")}>
              <IconTeam className="h-2.5 w-2.5 shrink-0" />
              <span>Times</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
          <Link href={href({ local: "cidade", page: 1 })} className={blockButton(state.local === "cidade")}>
            <IconPin className="h-2.5 w-2.5 shrink-0" />
            <span className="min-w-0 truncate">
              <CityGpsLabel fallbackCity={cidadeDisplay} />
            </span>
          </Link>
          <Link href={href({ local: "brasil", page: 1 })} className={blockButton(state.local === "brasil")}>
            <IconBrazil className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">Brasil</span>
          </Link>
        </div>
        {needsCidadeFallback ? (
          <p className="px-0.5 text-xs leading-snug text-eid-text-secondary">
            Sem cidade —{" "}
            <Link href="/conta/perfil" className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
              perfil
            </Link>
          </p>
        ) : null}

        {todosEsportes.length > 0 ? (
          <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
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
                      "inline-flex h-[1.38rem] w-auto shrink-0 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200",
                      active
                        ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_6px_14px_-10px_rgba(37,99,235,0.35)]"
                        : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55 hover:text-eid-fg",
                      isPrincipal && !active && "bg-eid-primary-500/08 text-eid-fg/90"
                    )}
                  >
                    <IconSport className="h-2.5 w-2.5 shrink-0" />
                    <span>{opt.nome}</span>
                  </Link>
                );
              })}
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
      <div className="relative grid h-7 min-w-[6.75rem] grid-cols-2 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 p-0.5 text-[10px] backdrop-blur-sm [&_a]:[-webkit-tap-highlight-color:transparent] [&_a]:block [&_a]:h-full [&_a]:w-full">
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
            "relative z-[1] flex h-full w-full touch-manipulation items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors duration-200 cursor-pointer",
            state.periodo === "ano" ? "text-eid-fg" : "text-eid-text-secondary hover:text-eid-fg"
          )}
        >
          Ano
        </Link>
        <Link
          href={href({ periodo: "mes", page: 1 })}
          className={cn(
            "relative z-[1] flex h-full w-full touch-manipulation items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors duration-200 cursor-pointer",
            state.periodo === "mes" ? "text-eid-fg" : "text-eid-text-secondary hover:text-eid-fg"
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
      <div className="relative grid h-7 min-w-[6.75rem] grid-cols-2 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 p-0.5 text-[10px] backdrop-blur-sm [&_a]:[-webkit-tap-highlight-color:transparent] [&_a]:block [&_a]:h-full [&_a]:w-full">
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
            "relative z-[1] flex h-full w-full touch-manipulation items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors duration-200 cursor-pointer",
            rankIsMatch ? "text-eid-fg" : "text-eid-text-secondary hover:text-eid-fg"
          )}
        >
          Match
        </Link>
        <Link
          href={href({ rank: "eid", page: 1 })}
          className={cn(
            "relative z-[1] flex h-full w-full touch-manipulation items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors duration-200 cursor-pointer",
            !rankIsMatch ? "text-eid-fg" : "text-eid-text-secondary hover:text-eid-fg"
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
    "inline-flex min-w-0 flex-1 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-sm px-1 text-[9px] font-semibold uppercase leading-none tracking-[0.035em] transition-all duration-200",
    active
      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_4px_14px_-8px_rgba(37,99,235,0.38)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/35 hover:text-eid-fg"
  );
}

function blockButton(active: boolean) {
  return cn(
    "inline-flex h-[1.38rem] w-auto min-w-0 touch-manipulation items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200",
    active
      ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_6px_14px_-10px_rgba(37,99,235,0.35)]"
      : "bg-transparent text-eid-text-secondary hover:bg-eid-surface/55 hover:text-eid-fg"
  );
}

/** Selo EID sobre a borda inferior do avatar. */
export function RankingEidSeal({ score }: { score: number }) {
  const safe = Number.isFinite(score) ? score : 0;
  return (
    <span
      className="pointer-events-none absolute bottom-0 left-1/2 z-[3] flex -translate-x-1/2 translate-y-[40%] items-center rounded-full border border-eid-primary-500/45 text-[6px] font-black uppercase leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
      aria-hidden
    >
      <span className="rounded-l-full bg-black px-[3px] py-px pl-[4px]">EID</span>
      <span className="rounded-r-full bg-eid-primary-500 px-[3px] py-px pr-[4px] tabular-nums">{safe.toFixed(1)}</span>
    </span>
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
      <div className="eid-podium-card overflow-visible rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--eid-primary-500)_28%,transparent),color-mix(in_srgb,var(--eid-card)_95%,transparent)_44%,color-mix(in_srgb,var(--eid-surface)_96%,transparent)_100%)] px-2.5 py-3 backdrop-blur-sm shadow-[0_16px_30px_-20px_rgba(15,23,42,0.35),0_0_30px_-12px_rgba(37,99,235,0.55)] [&_a]:[-webkit-tap-highlight-color:transparent]">
        {rankToggle || periodToggle ? (
          <div className="mb-0 flex items-center justify-between gap-1.5">
            <div className="min-w-0">{rankToggle}</div>
            <div className="min-w-0">{periodToggle}</div>
          </div>
        ) : null}
        <h2 className="eid-podium-title -mt-6 mb-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-transparent bg-gradient-to-b from-white via-eid-primary-300 to-eid-primary-500 bg-clip-text drop-shadow-[0_1px_3px_rgba(37,99,235,0.45)]">
          Pódio
        </h2>
        {hasAnyPodium ? (
          <div className="mx-auto grid w-full max-w-[46rem] grid-cols-3 items-end gap-2">
            <div className="min-h-[1px]">
              {second ? <PodiumFace slot={second} highlight={false} rankKind={rankKind} /> : null}
            </div>
            <div className="z-10 -translate-y-1">
              {first ? <PodiumFace slot={first} highlight rankKind={rankKind} /> : null}
            </div>
            <div className="min-h-[1px]">
              {third ? <PodiumFace slot={third} highlight={false} rankKind={rankKind} /> : null}
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
      ? "h-[3.35rem] w-[3.35rem] border-[1.5px]"
      : "h-[2.55rem] w-[2.55rem] border-[1.5px]",
    placeTone,
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-white/5 before:opacity-70 before:animate-[pulse_2.8s_ease-in-out_infinite]"
  );
  return (
    <div className={cn("flex flex-col items-center text-center", highlight && "scale-[1.03]")}>
      <span className="mb-0.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-1 py-px text-[8px] font-black tabular-nums text-eid-primary-300">
        {slot.place}
      </span>
      {highlight ? (
        <div className="mb-0.5 text-eid-primary-400/55" aria-hidden>
          <IconCrown className="mx-auto h-2.5 w-2.5" />
        </div>
      ) : (
        <div className="mb-0.5 h-2.5" aria-hidden />
      )}
      <Link
        href={slot.href}
        className="group relative flex flex-col items-center outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
        aria-label={`Perfil de ${slot.nome}`}
      >
        <div className="relative pb-1.5">
          <div className={avatarClass}>
            {slot.avatarUrl ? (
              <img src={slot.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[7px] font-bold text-eid-primary-300">{initial}</div>
            )}
          </div>
          {rankKind === "match" ? <RankingEidSeal score={slot.notaEid} /> : null}
        </div>
      </Link>
      <p className="mt-1.5 line-clamp-2 max-w-[10rem] px-0.5 text-[10px] font-bold leading-tight text-eid-fg">
        {slot.nome}
      </p>
      <p className="mt-0.5 text-[10px] font-black tabular-nums text-eid-primary-300">
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
  avatarUrl,
  href,
}: {
  rank: number;
  nome: string;
  metricValue: number;
  metricKind: "pontos" | "eid";
  avatarUrl: string | null;
  href: string;
}) {
  const initial = (nome.trim().slice(0, 2) || "—").toUpperCase();
  const valueText = metricKind === "eid" ? metricValue.toFixed(1) : String(metricValue);
  return (
    <div className="flex items-center gap-2 border-b border-[color:var(--eid-border-subtle)] py-1.5 last:border-b-0">
      <span className="w-7 shrink-0 text-center text-base font-black tabular-nums text-eid-primary-300">{rank}º</span>
      <Link
        href={href}
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] transition hover:border-eid-primary-500/35"
        aria-label={`Perfil de ${nome}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[9px] font-bold text-eid-primary-300">{initial}</div>
        )}
      </Link>
      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-eid-fg">{nome}</p>
      <p className="shrink-0 text-base font-black tabular-nums text-eid-primary-300">{valueText}</p>
    </div>
  );
}

export function ViewerRankCard({ rank }: { rank: number }) {
  return (
    <div className="mb-2 rounded-lg border border-eid-primary-500/25 bg-eid-primary-500/[0.06] px-2.5 py-1.5 text-center">
      <p className="text-xs text-eid-text-secondary">
        Sua posição: <span className="text-base font-black tabular-nums text-eid-primary-300">{rank}º</span>
      </p>
    </div>
  );
}
