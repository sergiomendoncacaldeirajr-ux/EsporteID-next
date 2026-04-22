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
    <div className="mb-3 space-y-2 px-2 sm:mb-3.5">
      <div className="rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.52))] p-1 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)]">
        <div className="flex items-center gap-1.5">
          <Link href={href({ tipo: "individual", page: 1 })} className={segmentButton(state.tipo === "individual")}>
          Individual
          </Link>
          <Link href={href({ tipo: "dupla", page: 1 })} className={segmentButton(state.tipo === "dupla")}>
          Dupla
          </Link>
          <Link href={href({ tipo: "time", page: 1 })} className={segmentButton(state.tipo === "time")}>
          Time
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(15,23,42,0.5))] p-1 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)]">
        <Link href={href({ local: "cidade", page: 1 })} className={blockButton(state.local === "cidade")}>
          <CityGpsLabel fallbackCity={cidadeDisplay} />
        </Link>
        <Link href={href({ local: "brasil", page: 1 })} className={blockButton(state.local === "brasil")}>
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
        <div className="rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(15,23,42,0.5))] p-1 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)]">
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth whitespace-nowrap pb-1 pr-0.5 select-none [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden">
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
                    "inline-flex h-[1.72rem] w-auto shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-2 text-[11px] font-medium leading-none tracking-[0.01em] transition-all duration-200",
                    active
                      ? "border-blue-500/85 bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white shadow-[0_0_14px_-7px_rgba(37,99,235,0.8),inset_0_1px_0_rgba(255,255,255,0.22)]"
                      : "border-white/15 bg-transparent text-[#9CA3AF] hover:border-white/25 hover:bg-white/[0.04] hover:text-eid-fg",
                    isPrincipal && !active && "ring-1 ring-eid-primary-500/25"
                  )}
                >
                  {opt.nome}
                </Link>
              );
            })}
          </div>
        </div>
        </div>
      ) : null}
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
      <div className="relative inline-flex h-6.5 items-center rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px] backdrop-blur-sm">
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 h-5.5 w-[calc(50%-2px)] rounded-full bg-eid-primary-500/80 shadow-[0_0_10px_-6px_rgba(37,99,235,0.75)] transition-all duration-200",
            state.periodo === "mes" ? "translate-x-[calc(100%+1px)]" : "translate-x-0"
          )}
          aria-hidden
        />
        <Link
          href={href({ periodo: "ano", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-5.5 min-w-[2.9rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors duration-200",
            state.periodo === "ano" ? "text-white" : "text-[#9CA3AF] hover:text-eid-fg"
          )}
        >
          Ano
        </Link>
        <Link
          href={href({ periodo: "mes", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-5.5 min-w-[2.9rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors duration-200",
            state.periodo === "mes" ? "text-white" : "text-[#9CA3AF] hover:text-eid-fg"
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
      <div className="relative inline-flex h-6.5 items-center rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px] backdrop-blur-sm">
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 h-5.5 w-[calc(50%-2px)] rounded-full bg-eid-primary-500/80 shadow-[0_0_10px_-6px_rgba(37,99,235,0.75)] transition-all duration-200",
            rankIsMatch ? "translate-x-0" : "translate-x-[calc(100%+1px)]"
          )}
          aria-hidden
        />
        <Link
          href={href({ rank: "match", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-5.5 min-w-[3.35rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors duration-200",
            rankIsMatch ? "text-white" : "text-[#9CA3AF] hover:text-eid-fg"
          )}
        >
          Match
        </Link>
        <Link
          href={href({ rank: "eid", page: 1 })}
          className={cn(
            "relative z-[1] inline-flex h-5.5 min-w-[2.9rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors duration-200",
            !rankIsMatch ? "text-white" : "text-[#9CA3AF] hover:text-eid-fg"
          )}
        >
          EID
        </Link>
      </div>
    </div>
  );
}

function segmentButton(active: boolean) {
  return cn(
    "inline-flex h-[1.72rem] w-auto flex-1 items-center justify-center rounded-full border px-2 text-[11px] font-medium leading-none tracking-[0.01em] transition-all duration-200",
    active
      ? "border-blue-500/85 bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white shadow-[0_0_14px_-7px_rgba(37,99,235,0.8),inset_0_1px_0_rgba(255,255,255,0.22)]"
      : "border-white/15 bg-transparent text-[#9CA3AF] hover:border-white/25 hover:bg-white/[0.04] hover:text-eid-fg"
  );
}

function blockButton(active: boolean) {
  return cn(
    "inline-flex h-[1.72rem] w-auto min-w-0 items-center justify-center rounded-full border px-2 text-[11px] font-medium leading-none tracking-[0.01em] transition-all duration-200",
    active
      ? "border-blue-500/85 bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white shadow-[0_0_14px_-7px_rgba(37,99,235,0.8),inset_0_1px_0_rgba(255,255,255,0.22)]"
      : "border-white/15 bg-transparent text-[#9CA3AF] hover:border-white/25 hover:bg-white/[0.04] hover:text-eid-fg"
  );
}

/** Selo EID sobre a borda inferior do avatar. */
export function RankingEidSeal({ score }: { score: number }) {
  const safe = Number.isFinite(score) ? score : 0;
  return (
    <span
      className="pointer-events-none absolute bottom-0 left-1/2 z-[3] flex -translate-x-1/2 translate-y-[40%] items-center rounded-full border border-eid-primary-500/45 text-[6px] font-black uppercase leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] sm:text-[7px]"
      aria-hidden
    >
      <span className="rounded-l-full bg-black px-[4px] py-px pl-[5px] sm:py-0.5">EID</span>
      <span className="rounded-r-full bg-eid-primary-500 px-[4px] py-px pr-[5px] tabular-nums sm:py-0.5">{safe.toFixed(1)}</span>
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
  rankToggle,
  periodToggle,
}: {
  second: PodiumSlot | null;
  first: PodiumSlot | null;
  third: PodiumSlot | null;
  rankToggle?: ReactNode;
  periodToggle?: ReactNode;
}) {
  const slots: (PodiumSlot & { key: string; highlight: boolean; lift: boolean })[] = [];
  if (second) slots.push({ ...second, key: "2", highlight: false, lift: false });
  if (first) slots.push({ ...first, key: "1", highlight: true, lift: true });
  if (third) slots.push({ ...third, key: "3", highlight: false, lift: false });
  if (slots.length === 0 && !periodToggle && !rankToggle) return null;

  const n = slots.length;
  const wrap =
    n === 1
      ? "mx-auto w-full max-w-[10rem]"
      : n === 2
        ? "min-w-0 w-[46%] max-w-[9rem] shrink sm:max-w-[10rem]"
        : "min-w-0 w-[30%] max-w-[8.5rem] shrink sm:max-w-[10rem] md:w-[31%]";

  return (
    <section className="relative mb-0.5 sm:mb-1">
      <div className="rounded-2xl border border-white/15 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.2),rgba(15,23,42,0.82)_42%,rgba(2,6,23,0.92)_100%)] px-2 py-2.5 backdrop-blur-sm shadow-[0_16px_30px_-20px_rgba(15,23,42,0.95),0_0_24px_-14px_rgba(37,99,235,0.45)] sm:px-3 sm:py-3">
        {rankToggle || periodToggle ? (
          <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
            <div className="min-w-0">{rankToggle}</div>
            <div className="min-w-0">{periodToggle}</div>
          </div>
        ) : null}
        <h2 className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary sm:mb-2.5 sm:text-[10px]">
          Pódio
        </h2>
        {slots.length > 0 ? (
          <div
            className={cn(
              "flex flex-row items-end justify-center gap-2.5 sm:gap-4 md:gap-6",
              n === 1 && "mx-auto max-w-sm",
              n === 2 && "mx-auto max-w-md"
            )}
          >
            {slots.map((s) => (
              <div key={s.key} className={cn(wrap, s.lift && "z-10 md:-translate-y-0.5")}>
                <PodiumFace slot={s} highlight={s.highlight} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-eid-text-secondary">Sem pódio para o período selecionado.</p>
        )}
      </div>
    </section>
  );
}

function PodiumFace({ slot, highlight }: { slot: PodiumSlot; highlight: boolean }) {
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
      ? "h-[2.7rem] w-[2.7rem] border-[1.5px] sm:h-[2.85rem] sm:w-[2.85rem]"
      : "h-[2.1rem] w-[2.1rem] border-[1.5px] sm:h-[2.25rem] sm:w-[2.25rem]",
    placeTone,
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-white/5 before:opacity-70 before:animate-[pulse_2.8s_ease-in-out_infinite]"
  );
  return (
    <div className={cn("flex flex-col items-center text-center", highlight && "scale-[1.02] sm:scale-[1.025]")}>
      <span className="mb-0.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-1.5 py-px text-[8px] font-black tabular-nums text-eid-primary-300 sm:text-[9px]">
        {slot.place}
      </span>
      {highlight ? (
        <div className="mb-0.5 text-eid-primary-400/55" aria-hidden>
          <IconCrown className="mx-auto h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </div>
      ) : (
        <div className="mb-0.5 h-2.5 sm:h-3" aria-hidden />
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
              <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[7px] font-bold text-eid-primary-300 sm:text-[8px]">{initial}</div>
            )}
          </div>
          <RankingEidSeal score={slot.notaEid} />
        </div>
      </Link>
      <p className="mt-1.5 line-clamp-2 max-w-[8.5rem] px-0.5 text-[9px] font-bold leading-tight text-eid-fg sm:mt-2 sm:max-w-[9.5rem] sm:text-[10px]">
        {slot.nome}
      </p>
      <p className="mt-0.5 text-[9px] font-black tabular-nums text-eid-primary-300 sm:text-[10px]">
        {slot.pontos} <span className="text-[7px] font-bold uppercase tracking-wide text-eid-text-secondary">PTS</span>
      </p>
    </div>
  );
}

export function RankingRow({
  rank,
  nome,
  pontos,
  avatarUrl,
  href,
}: {
  rank: number;
  nome: string;
  pontos: number;
  avatarUrl: string | null;
  href: string;
}) {
  const initial = (nome.trim().slice(0, 2) || "—").toUpperCase();
  return (
    <div className="flex items-center gap-2 border-b border-[color:var(--eid-border-subtle)] py-1.5 last:border-b-0 sm:gap-2.5 sm:py-2">
      <span className="w-7 shrink-0 text-center text-base font-black tabular-nums text-eid-primary-300 sm:w-8 sm:text-lg">{rank}º</span>
      <Link
        href={href}
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] transition hover:border-eid-primary-500/35 sm:h-10 sm:w-10"
        aria-label={`Perfil de ${nome}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[9px] font-bold text-eid-primary-300">{initial}</div>
        )}
      </Link>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-eid-fg">{nome}</p>
      <p className="shrink-0 text-base font-black tabular-nums text-eid-primary-300 sm:text-lg">{pontos}</p>
    </div>
  );
}

export function ViewerRankCard({ rank }: { rank: number }) {
  return (
    <div className="mb-2 rounded-[var(--eid-radius-lg)] border border-eid-primary-500/25 bg-eid-primary-500/[0.06] px-3 py-2 text-center sm:mb-3 sm:rounded-xl">
      <p className="text-sm text-eid-text-secondary">
        Sua posição: <span className="text-base font-black tabular-nums text-eid-primary-300 sm:text-lg">{rank}º</span>
      </p>
    </div>
  );
}
