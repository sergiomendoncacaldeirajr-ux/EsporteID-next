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
  cidadeDisplay: string | null;
  needsCidadeFallback: boolean;
  esporteAtualNome: string | null;
  esporteOptions: { id: number; nome: string }[];
};

/** Filtros compactos; esporte principal com acesso a outros (Ver outros esportes). */
export function RankingFilterBar({
  state,
  principalEsporteId,
  cidadeDisplay,
  needsCidadeFallback,
  esporteAtualNome,
  esporteOptions,
}: FilterBarProps) {
  const pe = principalEsporteId;
  const href = (next: Parameters<typeof rankingHref>[0]) => rankingHref(next, state, pe);

  return (
    <div className="mb-4 space-y-2.5 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-2.5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.55)] sm:rounded-2xl sm:p-3">
      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Tipo</p>
        <div className="flex gap-1.5">
          <Link href={href({ tipo: "individual", page: 1 })} className={pillActive(state.tipo === "individual")}>
            Individual
          </Link>
          <Link href={href({ tipo: "dupla", page: 1 })} className={pillActive(state.tipo === "dupla")}>
            Dupla
          </Link>
          <Link href={href({ tipo: "time", page: 1 })} className={pillActive(state.tipo === "time")}>
            Time
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Ranking</p>
        <div className="flex gap-1.5">
          <Link href={href({ rank: "match", page: 1 })} className={pillActive(state.rank === "match")}>
            Rank Match
          </Link>
          <Link href={href({ rank: "eid", page: 1 })} className={pillActive(state.rank === "eid")}>
            Rank EID
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Local</p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={href({ local: "cidade", page: 1 })}
            className={pillActive(state.local === "cidade")}
            title={cidadeDisplay ? `Cidade: ${cidadeDisplay}` : undefined}
          >
            <span className="flex flex-col items-center leading-none">
              <span>Cidade</span>
              {cidadeDisplay ? (
                <span className="mt-0.5 max-w-[6.5rem] truncate text-[8px] font-semibold normal-case tracking-normal opacity-95">
                  {cidadeDisplay}
                </span>
              ) : null}
            </span>
          </Link>
          <Link href={href({ local: "brasil", page: 1 })} className={pillActive(state.local === "brasil")}>
            Brasil
          </Link>
        </div>
        {needsCidadeFallback ? (
          <p className="mt-1.5 text-[10px] leading-snug text-eid-text-secondary">
            Sem cidade no perfil —{" "}
            <Link href="/conta/perfil" className="font-bold text-eid-primary-300 underline-offset-2 hover:underline">
              definir manualmente
            </Link>
            .
          </p>
        ) : null}
      </div>

      {esporteOptions.length > 0 ? (
        <div className="border-t border-[color:var(--eid-border-subtle)] pt-2.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Esporte</p>
          <p className="mb-1 truncate text-[11px] font-semibold text-eid-fg" title={esporteAtualNome ?? undefined}>
            {esporteAtualNome ?? "—"}
          </p>
          {esporteOptions.length > 1 ? (
            <details className="group rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] bg-eid-surface/40">
              <summary className="cursor-pointer list-none px-2 py-1.5 text-[10px] font-bold text-eid-primary-300 transition hover:bg-eid-surface/60 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  Ver outros esportes
                  <span className="text-eid-text-secondary transition group-open:rotate-180">▾</span>
                </span>
              </summary>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto border-t border-[color:var(--eid-border-subtle)] px-1.5 py-1.5">
                {esporteOptions.map((opt) => {
                  const active = state.esporte ? state.esporte === String(opt.id) : opt.id === principalEsporteId;
                  return (
                    <li key={opt.id}>
                      <Link
                        href={href({ esporte: opt.id === principalEsporteId ? "" : String(opt.id), page: 1 })}
                        className={cn(
                          "block truncate rounded-md px-2 py-1 text-[11px] font-semibold transition",
                          active ? "bg-eid-primary-500/15 text-eid-primary-300" : "text-eid-fg hover:bg-eid-surface/80"
                        )}
                      >
                        {opt.nome}
                        {opt.id === principalEsporteId ? (
                          <span className="ml-1 text-[9px] font-medium text-eid-text-secondary">(principal)</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function pillActive(active: boolean) {
  return cn(
    "inline-flex min-h-[2rem] flex-1 items-center justify-center rounded-full px-2 py-1 text-center text-[10px] font-bold leading-tight transition sm:min-h-[2.125rem] sm:px-2.5 sm:text-[11px]",
    active
      ? "bg-eid-primary-500 text-white shadow-sm"
      : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
  );
}

/** Selo EID compacto (preto + azul primário), posicionado para ficar visível fora do círculo da foto. */
export function RankingEidSeal({ score }: { score: number }) {
  const safe = Number.isFinite(score) ? score : 0;
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-full z-[2] flex -translate-x-1/2 -translate-y-1/2 items-center overflow-visible rounded-full border border-eid-primary-500/45 text-[7px] font-black uppercase leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:text-[8px]"
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
        : "min-w-0 w-[30%] max-w-[9.5rem] shrink sm:max-w-[11rem] md:w-[31%]";

  return (
    <section className="relative mb-6 sm:mb-7">
      <div
        className="pointer-events-none absolute -inset-x-4 -top-4 bottom-0 -z-10 mx-auto max-w-3xl rounded-[2rem] bg-[radial-gradient(ellipse_85%_55%_at_50%_12%,rgba(37,99,235,0.1),transparent_65%)] md:-inset-x-8"
        aria-hidden
      />
      <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-eid-text-secondary">Pódio</h2>
      <div
        className={cn(
          "flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-8",
          n === 1 && "mx-auto max-w-sm",
          n === 2 && "mx-auto max-w-md"
        )}
      >
        {slots.map((s) => (
          <div key={s.key} className={cn(wrap, s.lift && "z-10 md:-translate-y-1.5")}>
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
    highlight
      ? "h-[4.85rem] w-[4.85rem] border-eid-primary-500/60 shadow-[0_8px_28px_-10px_rgba(37,99,235,0.45)] sm:h-[5.15rem] sm:w-[5.15rem]"
      : "h-12 w-12 border-eid-primary-500/30 sm:h-[3.35rem] sm:w-[3.35rem]"
  );
  return (
    <div className="flex flex-col items-center text-center">
      {highlight ? (
        <div className="mb-0.5 text-eid-primary-400" aria-hidden>
          <IconCrown className="mx-auto h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      ) : (
        <div className="mb-0.5 h-5 sm:h-6" aria-hidden />
      )}
      <div className="flex w-full flex-col items-center">
        <div className="relative mb-3 w-full overflow-visible px-1 pt-0.5">
          <Link
            href={slot.href}
            className="group relative mx-auto block w-fit outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
            aria-label={`Perfil de ${slot.nome}`}
          >
            <div className={avatarClass}>
              {slot.avatarUrl ? (
                <img src={slot.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[10px] font-bold text-eid-primary-300 sm:text-[11px]">{initial}</div>
              )}
            </div>
            <RankingEidSeal score={slot.notaEid} />
          </Link>
        </div>
        <p className="line-clamp-2 max-w-[9.5rem] text-[11px] font-bold leading-tight text-eid-fg sm:max-w-[10rem] sm:text-xs">{slot.nome}</p>
        <p className="mt-0.5 text-[10px] font-black tabular-nums text-eid-text-secondary">{slot.place}</p>
        <p className="mt-0.5 text-[11px] font-black tabular-nums text-eid-primary-300 sm:text-xs">
          {slot.pontos} <span className="text-[9px] font-bold uppercase tracking-wide text-eid-text-secondary">PTS</span>
        </p>
      </div>
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
