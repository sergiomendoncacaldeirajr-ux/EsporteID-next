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
  const chip = (active: boolean) => pillRow(active);

  return (
    <div className="mb-3 space-y-2 sm:mb-3.5">
      <div className="flex items-center gap-2">
        <Link href={href({ tipo: "individual", page: 1 })} className={chip(state.tipo === "individual")}>
          Individual
        </Link>
        <Link href={href({ tipo: "dupla", page: 1 })} className={chip(state.tipo === "dupla")}>
          Dupla
        </Link>
        <Link href={href({ tipo: "time", page: 1 })} className={chip(state.tipo === "time")}>
          Time
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link href={href({ rank: "match", page: 1 })} className={chip(state.rank === "match")}>
          Rank Match
        </Link>
        <Link href={href({ rank: "eid", page: 1 })} className={chip(state.rank === "eid")}>
          Rank EID
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link href={href({ local: "cidade", page: 1 })} className={chip(state.local === "cidade")} title={cidadeDisplay ? `Cidade: ${cidadeDisplay}` : undefined}>
          Cidade
        </Link>
        <Link href={href({ local: "brasil", page: 1 })} className={chip(state.local === "brasil")}>
          Brasil
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
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth whitespace-nowrap pb-1 pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max flex-nowrap items-center gap-2">
            {todosEsportes.map((opt) => {
              const active = selectedEsporteId === opt.id;
              const isPrincipal = principalEsporteId != null && opt.id === principalEsporteId;
              return (
                <Link
                  key={opt.id}
                  href={href({ esporte: opt.id === principalEsporteId ? "" : String(opt.id), page: 1 })}
                  title={isPrincipal ? "Esporte principal do perfil" : undefined}
                  className={cn(
                    "inline-flex h-9 w-auto shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-sm font-medium leading-none transition",
                    active
                      ? "border-eid-primary-500 bg-eid-primary-500 text-white"
                      : "border-[color:var(--eid-border-subtle)] bg-transparent text-eid-text-secondary hover:border-eid-primary-500/35 hover:text-eid-fg",
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
    "inline-flex h-9 w-auto items-center justify-center rounded-full border px-3 text-sm font-medium leading-none transition",
    active
      ? "border-eid-primary-500 bg-eid-primary-500 text-white"
      : "border-[color:var(--eid-border-subtle)] bg-transparent text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
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
      <div className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)]/70 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.14),rgba(15,23,42,0.08)_40%,rgba(15,23,42,0.02)_72%)] px-1 py-2 shadow-[0_0_20px_-10px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-2 sm:py-2.5">
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
  const placeTone =
    slot.place === "1º"
      ? "border-amber-300/80 shadow-[0_0_16px_-7px_rgba(251,191,36,0.45)]"
      : slot.place === "2º"
        ? "border-slate-200/80 shadow-[0_0_14px_-7px_rgba(226,232,240,0.4)]"
        : "border-amber-700/70 shadow-[0_0_14px_-7px_rgba(180,83,9,0.4)]";
  const avatarClass = cn(
    "relative mx-auto shrink-0 overflow-hidden rounded-full",
    highlight
      ? "h-[2.7rem] w-[2.7rem] border-[1.5px] sm:h-[2.85rem] sm:w-[2.85rem]"
      : "h-[2.1rem] w-[2.1rem] border-[1.5px] sm:h-[2.25rem] sm:w-[2.25rem]",
    placeTone,
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-white/5 before:opacity-0 before:animate-[pulse_3s_ease-in-out_infinite]",
    highlight && "before:opacity-100"
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
      <p className="mt-1 line-clamp-2 max-w-[8.5rem] px-0.5 text-[9px] font-bold leading-tight text-eid-fg sm:mt-1.5 sm:max-w-[9.5rem] sm:text-[10px]">
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
