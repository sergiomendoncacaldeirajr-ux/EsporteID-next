import Link from "next/link";
import type { RankingSearchState } from "@/lib/ranking/ranking-href";
import { rankingHref } from "@/lib/ranking/ranking-href";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Filtros: tipo, rank e local (esporte vem do perfil, não da URL). */
export function RankingFilterBar({ state }: { state: RankingSearchState }) {
  return (
    <div className="mb-5 space-y-3 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-3.5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.55)] sm:rounded-2xl sm:p-4">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Tipo</p>
        <div className="flex gap-2">
          <Link href={rankingHref({ tipo: "individual", page: 1 }, state)} className={pillActive(state.tipo === "individual")}>
            Individual
          </Link>
          <Link href={rankingHref({ tipo: "dupla", page: 1 }, state)} className={pillActive(state.tipo === "dupla")}>
            Dupla
          </Link>
          <Link href={rankingHref({ tipo: "time", page: 1 }, state)} className={pillActive(state.tipo === "time")}>
            Time
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Ranking</p>
        <div className="flex gap-2">
          <Link href={rankingHref({ rank: "match", page: 1 }, state)} className={pillActive(state.rank === "match")}>
            Rank Match
          </Link>
          <Link href={rankingHref({ rank: "eid", page: 1 }, state)} className={pillActive(state.rank === "eid")}>
            Rank EID
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Local</p>
        <div className="flex gap-2">
          <Link href={rankingHref({ local: "cidade", page: 1 }, state)} className={pillActive(state.local === "cidade")}>
            Cidade
          </Link>
          <Link href={rankingHref({ local: "brasil", page: 1 }, state)} className={pillActive(state.local === "brasil")}>
            Brasil
          </Link>
        </div>
      </div>
    </div>
  );
}

function pillActive(active: boolean) {
  return cn(
    "inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-2.5 py-1.5 text-center text-[11px] font-bold transition sm:min-h-10 sm:px-3 sm:text-xs",
    active
      ? "bg-eid-primary-500 text-white shadow-sm"
      : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
  );
}

/** Selo EID compacto sobre a foto (preto + azul primário). */
export function RankingEidSeal({ score }: { score: number }) {
  const safe = Number.isFinite(score) ? score : 0;
  return (
    <span
      className="pointer-events-none absolute bottom-0 left-1/2 z-[1] flex -translate-x-1/2 translate-y-[22%] items-center overflow-hidden rounded-full border border-eid-primary-500/45 text-[7px] font-black uppercase leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:text-[8px]"
      aria-hidden
    >
      <span className="bg-black px-[5px] py-[3px] sm:px-1.5 sm:py-0.5">EID</span>
      <span className="bg-eid-primary-500 px-[5px] py-[3px] tabular-nums sm:px-1.5 sm:py-0.5">{safe.toFixed(1)}</span>
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
      ? "mx-auto w-full max-w-[11rem]"
      : n === 2
        ? "min-w-0 w-[46%] max-w-[10rem] shrink sm:max-w-[11rem]"
        : "min-w-0 w-[31%] max-w-[9rem] shrink pb-0.5 sm:max-w-[10.5rem] md:w-[32%]";

  return (
    <section className="relative mb-6 sm:mb-7">
      <div
        className="pointer-events-none absolute -inset-x-4 -top-4 bottom-0 -z-10 mx-auto max-w-3xl rounded-[2rem] bg-[radial-gradient(ellipse_85%_55%_at_50%_12%,rgba(37,99,235,0.1),transparent_65%)] md:-inset-x-8"
        aria-hidden
      />
      <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-eid-text-secondary">Pódio</h2>
      <div
        className={cn(
          "flex flex-row items-end justify-center gap-1.5 sm:gap-3 md:gap-6",
          n === 1 && "mx-auto max-w-sm",
          n === 2 && "mx-auto max-w-md"
        )}
      >
        {slots.map((s) => (
          <div key={s.key} className={cn(wrap, s.lift && "z-10 md:-translate-y-1")}>
            <PodiumFace slot={s} highlight={s.highlight} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PodiumFace({ slot, highlight }: { slot: PodiumSlot; highlight: boolean }) {
  const initial = (slot.nome.trim().slice(0, 2) || "—").toUpperCase();
  const avatarClass = cn(
    "relative shrink-0 overflow-hidden rounded-full border-2",
    highlight ? "h-[4.25rem] w-[4.25rem] border-eid-primary-500/55 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-14 w-14 border-eid-primary-500/35 sm:h-[3.75rem] sm:w-[3.75rem]"
  );
  return (
    <div className="flex flex-col items-center text-center">
      <Link
        href={slot.href}
        className="group relative mb-1.5 outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500 rounded-full"
        aria-label={`Perfil de ${slot.nome}`}
      >
        <div className={avatarClass}>
          {slot.avatarUrl ? (
            <img src={slot.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[10px] font-bold text-eid-primary-300 sm:text-[11px]">{initial}</div>
          )}
          <RankingEidSeal score={slot.notaEid} />
        </div>
      </Link>
      <p className="line-clamp-2 max-w-[9.5rem] text-[11px] font-bold leading-tight text-eid-fg sm:max-w-[10rem] sm:text-xs">{slot.nome}</p>
      <p className="mt-0.5 text-[10px] font-black tabular-nums text-eid-text-secondary">{slot.place}</p>
      <p className="mt-0.5 text-[11px] font-black tabular-nums text-eid-primary-300 sm:text-xs">
        {slot.pontos} <span className="text-[9px] font-bold uppercase tracking-wide text-eid-text-secondary">PTS</span>
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
    <div className="mb-3 rounded-[var(--eid-radius-lg)] border border-eid-primary-500/25 bg-eid-primary-500/[0.06] px-3 py-2.5 text-center sm:rounded-xl">
      <p className="text-sm text-eid-text-secondary">
        Sua posição: <span className="text-base font-black tabular-nums text-eid-primary-300 sm:text-lg">{rank}º</span>
      </p>
    </div>
  );
}
