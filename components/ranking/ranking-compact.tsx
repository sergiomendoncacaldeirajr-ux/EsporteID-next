import Link from "next/link";
import type { RankingSearchState } from "@/lib/ranking/ranking-href";
import { rankingHref } from "@/lib/ranking/ranking-href";

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
    <div className="mb-3 rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-1.5 py-1 shadow-[0_2px_12px_-8px_rgba(0,0,0,0.3)] sm:mb-3.5 sm:px-2 sm:py-1.5">
      <div className="flex gap-1">
        <Link href={href({ tipo: "individual", page: 1 })} className={pillRow(state.tipo === "individual")}>
          Individual
        </Link>
        <Link href={href({ tipo: "dupla", page: 1 })} className={pillRow(state.tipo === "dupla")}>
          Dupla
        </Link>
        <Link href={href({ tipo: "time", page: 1 })} className={pillRow(state.tipo === "time")}>
          Time
        </Link>
      </div>
      <div className="mt-1 flex gap-1">
        <Link href={href({ rank: "match", page: 1 })} className={pillRow(state.rank === "match")}>
          Rank Match
        </Link>
        <Link href={href({ rank: "eid", page: 1 })} className={pillRow(state.rank === "eid")}>
          Rank EID
        </Link>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Link
          href={href({ local: "cidade", page: 1 })}
          className={cn(pillRow(state.local === "cidade"), cidadeDisplay ? "min-h-[1.85rem] flex-col gap-0 py-0.5" : undefined)}
          title={cidadeDisplay ? `Cidade: ${cidadeDisplay}` : undefined}
        >
          <span className="leading-none">Cidade</span>
          {cidadeDisplay ? (
            <span className="max-w-[5.5rem] truncate text-[8px] font-semibold normal-case opacity-90">{cidadeDisplay}</span>
          ) : null}
        </Link>
        <Link href={href({ local: "brasil", page: 1 })} className={pillRow(state.local === "brasil")}>
          Brasil
        </Link>
      </div>
      {needsCidadeFallback ? (
        <p className="mt-1 px-0.5 text-[8px] leading-snug text-eid-text-secondary">
          Sem cidade —{" "}
          <Link href="/conta/perfil" className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
            perfil
          </Link>
        </p>
      ) : null}

      {todosEsportes.length > 0 ? (
        <div className="mt-1.5 -mx-0.5 border-t border-[color:var(--eid-border-subtle)] pt-1.5">
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {todosEsportes.map((opt) => {
              const active = selectedEsporteId === opt.id;
              const isPrincipal = principalEsporteId != null && opt.id === principalEsporteId;
              return (
                <Link
                  key={opt.id}
                  href={href({ esporte: opt.id === principalEsporteId ? "" : String(opt.id), page: 1 })}
                  title={isPrincipal ? "Esporte principal do perfil" : undefined}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-center text-[9px] font-bold leading-none transition sm:text-[10px]",
                    active
                      ? "bg-eid-primary-500 text-white"
                      : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary hover:border-eid-primary-500/35 hover:text-eid-fg",
                    isPrincipal && !active && "ring-1 ring-eid-primary-500/25"
                  )}
                >
                  {opt.nome}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pillRow(active: boolean) {
  return cn(
    "inline-flex min-h-[1.45rem] flex-1 items-center justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-bold leading-none transition sm:min-h-[1.5rem] sm:text-[10px]",
    active
      ? "bg-eid-primary-500 text-white"
      : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
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

export function RankingPodium({ second, first, third }: { second: PodiumSlot | null; first: PodiumSlot | null; third: PodiumSlot | null }) {
  const slots: (PodiumSlot & { key: string; highlight: boolean; lift: boolean })[] = [];
  if (second) slots.push({ ...second, key: "2", highlight: false, lift: false });
  if (first) slots.push({ ...first, key: "1", highlight: true, lift: true });
  if (third) slots.push({ ...third, key: "3", highlight: false, lift: false });
  if (slots.length === 0) return null;

  const n = slots.length;
  const wrap =
    n === 1
      ? "mx-auto w-full max-w-[10rem]"
      : n === 2
        ? "min-w-0 w-[46%] max-w-[9rem] shrink sm:max-w-[10rem]"
        : "min-w-0 w-[30%] max-w-[8.5rem] shrink sm:max-w-[10rem] md:w-[31%]";

  return (
    <section className="relative mb-0.5 sm:mb-1">
      <div className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)]/70 bg-eid-surface/15 px-1 py-2 shadow-[0_0_20px_-10px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-2 sm:py-2.5">
        <h2 className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary sm:mb-2.5 sm:text-[10px]">
          Pódio
        </h2>
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
      </div>
    </section>
  );
}

function PodiumFace({ slot, highlight }: { slot: PodiumSlot; highlight: boolean }) {
  const initial = (slot.nome.trim().slice(0, 2) || "—").toUpperCase();
  const avatarClass = cn(
    "relative mx-auto shrink-0 overflow-hidden rounded-full",
    highlight
      ? "h-12 w-12 border border-eid-primary-500/38 shadow-[0_3px_14px_-6px_rgba(37,99,235,0.35)] sm:h-[3.05rem] sm:w-[3.05rem]"
      : "h-[2.35rem] w-[2.35rem] border border-eid-primary-500/20 shadow-[0_2px_6px_-4px_rgba(0,0,0,0.15)] sm:h-10 sm:w-10"
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
      <p className="line-clamp-2 max-w-[8.5rem] px-0.5 text-[9px] font-bold leading-tight text-eid-fg sm:max-w-[9.5rem] sm:text-[10px]">{slot.nome}</p>
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
