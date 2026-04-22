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
    <div className="mb-4 space-y-1 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-1.5 shadow-[0_3px_18px_-10px_rgba(0,0,0,0.35)] sm:mb-5 sm:rounded-2xl sm:p-2">
      <div>
        <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Tipo</p>
        <div className="flex gap-1">
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
        <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ranking</p>
        <div className="flex gap-1">
          <Link href={href({ rank: "match", page: 1 })} className={pillActive(state.rank === "match")}>
            Rank Match
          </Link>
          <Link href={href({ rank: "eid", page: 1 })} className={pillActive(state.rank === "eid")}>
            Rank EID
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Local</p>
        <div className="flex flex-wrap gap-1">
          <Link
            href={href({ local: "cidade", page: 1 })}
            className={cn(pillActive(state.local === "cidade"), "min-h-[2.1rem] py-1")}
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
          <p className="mt-1 text-[9px] leading-snug text-eid-text-secondary">
            Sem cidade no perfil —{" "}
            <Link href="/conta/perfil" className="font-bold text-eid-primary-300 underline-offset-2 hover:underline">
              definir manualmente
            </Link>
            .
          </p>
        ) : null}
      </div>

      {esporteOptions.length > 0 ? (
        <div className="border-t border-[color:var(--eid-border-subtle)] pt-1.5">
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Esporte</p>
          <p className="truncate text-[11px] font-semibold leading-tight text-eid-fg" title={esporteAtualNome ?? undefined}>
            {esporteAtualNome ?? "—"}
          </p>
          {esporteOptions.length > 1 ? (
            <details className="group mt-1">
              <summary className="block w-full cursor-pointer list-none py-0.5 text-left text-[10px] font-medium text-eid-primary-300 underline decoration-eid-primary-500/35 underline-offset-[3px] transition hover:decoration-eid-primary-500/65 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1">
                  Ver outros esportes
                  <span className="text-[9px] font-normal text-eid-text-secondary transition group-open:rotate-180" aria-hidden>
                    ▾
                  </span>
                </span>
              </summary>
              <ul className="mt-1.5 max-h-36 space-y-0.5 overflow-y-auto rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1 py-1">
                {esporteOptions.map((opt) => {
                  const active = state.esporte ? state.esporte === String(opt.id) : opt.id === principalEsporteId;
                  return (
                    <li key={opt.id}>
                      <Link
                        href={href({ esporte: opt.id === principalEsporteId ? "" : String(opt.id), page: 1 })}
                        className={cn(
                          "block truncate rounded px-2 py-1 text-[10px] font-semibold transition",
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
    "inline-flex min-h-[1.5rem] flex-1 items-center justify-center rounded-full px-1.5 py-px text-center text-[9px] font-bold leading-none transition sm:min-h-[1.625rem] sm:px-2 sm:text-[10px]",
    active
      ? "bg-eid-primary-500 text-white"
      : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
  );
}

/** Selo EID (preto + azul). `below` = pill centralizado sob a foto; `overlap` = sobre a borda inferior (legado). */
export function RankingEidSeal({ score, variant = "below" }: { score: number; variant?: "below" | "overlap" }) {
  const safe = Number.isFinite(score) ? score : 0;
  const pill = (
    <>
      <span className="rounded-l-full bg-black px-[5px] py-[2px] pl-[6px] sm:py-0.5">EID</span>
      <span className="rounded-r-full bg-eid-primary-500 px-[5px] py-[2px] pr-[6px] tabular-nums sm:py-0.5">{safe.toFixed(1)}</span>
    </>
  );
  if (variant === "overlap") {
    return (
      <span
        className="pointer-events-none absolute bottom-0 left-1/2 z-[3] flex -translate-x-1/2 translate-y-[42%] items-center rounded-full border border-eid-primary-500/45 text-[7px] font-black uppercase leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] sm:text-[8px]"
        aria-hidden
      >
        {pill}
      </span>
    );
  }
  return (
    <span
      className="pointer-events-none mt-1.5 inline-flex items-center rounded-full border border-eid-primary-500/45 text-[7px] font-black uppercase leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.22)] sm:mt-2 sm:text-[8px]"
      aria-hidden
    >
      {pill}
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
    <section className="relative mb-1 sm:mb-2">
      <h2 className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-eid-text-secondary sm:text-[11px]">
        Pódio
      </h2>
      <div
        className={cn(
          "flex flex-row items-end justify-center gap-3.5 sm:gap-5 md:gap-8",
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
    "relative mx-auto shrink-0 overflow-hidden rounded-full",
    highlight
      ? "h-14 w-14 border border-eid-primary-500/42 shadow-[0_4px_16px_-8px_rgba(37,99,235,0.28)] sm:h-[3.6rem] sm:w-[3.6rem]"
      : "h-10 w-10 border border-eid-primary-500/22 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.18)] sm:h-[2.65rem] sm:w-[2.65rem]"
  );
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        highlight && "scale-[1.025] sm:scale-[1.03]"
      )}
    >
      {highlight ? (
        <div className="mb-0.5 text-eid-primary-400/65" aria-hidden>
          <IconCrown className="mx-auto h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </div>
      ) : (
        <div className="mb-0.5 h-3 sm:h-3.5" aria-hidden />
      )}
      <div className="flex w-full flex-col items-center">
        <div className="mb-0.5 flex w-full flex-col items-center px-0.5 pb-1">
          <Link
            href={slot.href}
            className="group relative flex flex-col items-center outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
            aria-label={`Perfil de ${slot.nome}`}
          >
            <div className="relative">
              <div className={avatarClass}>
                {slot.avatarUrl ? (
                  <img src={slot.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-eid-surface text-[8px] font-bold text-eid-primary-300 sm:text-[9px]">{initial}</div>
                )}
              </div>
              <RankingEidSeal score={slot.notaEid} variant="overlap" />
            </div>
          </Link>
        </div>
        <p className="line-clamp-2 max-w-[9.5rem] text-[10px] font-bold leading-snug text-eid-fg sm:max-w-[10rem] sm:text-[11px]">{slot.nome}</p>
        <p className="mt-0.5 text-[9px] font-black tabular-nums text-eid-text-secondary sm:text-[10px]">{slot.place}</p>
        <p className="mt-0.5 text-[10px] font-black tabular-nums text-eid-primary-300 sm:text-xs">
          {slot.pontos} <span className="text-[8px] font-bold uppercase tracking-wide text-eid-text-secondary">PTS</span>
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
    <div className="mb-3 rounded-[var(--eid-radius-lg)] border border-eid-primary-500/25 bg-eid-primary-500/[0.06] px-3 py-2 text-center sm:mb-4 sm:rounded-xl">
      <p className="text-sm text-eid-text-secondary">
        Sua posição: <span className="text-base font-black tabular-nums text-eid-primary-300 sm:text-lg">{rank}º</span>
      </p>
    </div>
  );
}
