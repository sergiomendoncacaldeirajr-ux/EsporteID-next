import Link from "next/link";

export type AthleteRankingCardProps = {
  rank: number;
  nome: string;
  avatarUrl: string | null;
  localizacao: string;
  esporteNome: string;
  eid: number;
  vitorias: number;
  derrotas: number;
  pontos: number;
  partidas: number;
  usuarioId: string;
  esporteId: number;
  interesseMatch: string | null;
  viewerId: string;
  variant: "podium-1" | "podium-2" | "podium-3" | "list";
};

function InteresseChip({ interesse }: { interesse: string | null }) {
  const onlyRank = interesse === "ranking";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
        onlyRank
          ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
          : "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200"
      }`}
      title={onlyRank ? "Busca confrontos válidos só para ranking" : "Aceita ranking e jogos amistosos"}
    >
      {onlyRank ? "Só ranking" : "Rank + amistoso"}
    </span>
  );
}

export function AthleteRankingCard({
  rank,
  nome,
  avatarUrl,
  localizacao,
  esporteNome,
  eid,
  vitorias,
  derrotas,
  pontos,
  partidas,
  usuarioId,
  esporteId,
  interesseMatch,
  viewerId,
  variant,
}: AthleteRankingCardProps) {
  const isSelf = viewerId === usuarioId;
  const podium = variant.startsWith("podium");
  const ring =
    variant === "podium-1"
      ? "border-amber-400/35 md:border-amber-400/50 md:shadow-[0_0_28px_-8px_rgba(251,191,36,0.35)]"
      : variant === "podium-2"
        ? "border-slate-400/35 md:border-slate-400/45 md:shadow-[0_8px_24px_-12px_rgba(148,163,184,0.35)]"
        : variant === "podium-3"
          ? "border-orange-400/35 md:border-orange-400/40 md:shadow-[0_8px_24px_-12px_rgba(251,146,60,0.25)]"
          : "border-[color:var(--eid-border-subtle)]";

  const scale = variant === "podium-1" ? "md:scale-[1.03] md:z-10" : "";

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-eid-card p-3 transition hover:border-eid-primary-500/40 md:rounded-2xl md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/[0.07] md:p-4 ${ring} ${scale}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 hidden h-24 w-24 rounded-full bg-eid-primary-500/10 blur-2xl md:block" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black tabular-nums ${
              podium
                ? "bg-eid-primary-500/20 text-lg text-eid-primary-200"
                : "bg-eid-surface text-sm text-eid-primary-300"
            }`}
          >
            {rank}
          </div>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl border border-eid-primary-500/25 object-cover sm:h-16 sm:w-16" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/25 bg-eid-surface text-sm font-bold text-eid-primary-300 sm:h-16 sm:w-16">
              {(nome.trim().slice(0, 2) || "AT").toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold tracking-tight text-eid-fg">{nome}</p>
            <p className="truncate text-xs text-eid-text-secondary">{esporteNome}</p>
            <p className="mt-0.5 truncate text-xs text-eid-text-secondary">{localizacao}</p>
            <div className="mt-2">
              <InteresseChip interesse={interesseMatch} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 sm:w-52 sm:shrink-0 sm:border-l sm:border-[color:var(--eid-border-subtle)] sm:pl-4">
          <div className="text-center sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Nota EID</p>
            <p className="text-2xl font-black leading-none text-eid-action-500 md:text-4xl">{eid.toFixed(1)}</p>
            <p className="mt-1 text-[11px] text-eid-text-secondary">
              {partidas} jogos · {pontos} pts rank
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-2">
            <div className="rounded-lg bg-eid-surface/80 px-2 py-1.5">
              <span className="block text-[9px] font-bold uppercase text-eid-text-secondary">Vitórias</span>
              <span className="font-bold text-eid-fg">{vitorias}</span>
            </div>
            <div className="rounded-lg bg-eid-surface/80 px-2 py-1.5">
              <span className="block text-[9px] font-bold uppercase text-eid-text-secondary">Derrotas</span>
              <span className="font-bold text-eid-fg">{derrotas}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/perfil/${usuarioId}?from=/ranking`}
              className="flex-1 rounded-xl border border-eid-primary-500/40 px-3 py-2 text-center text-xs font-bold text-eid-fg transition hover:bg-eid-primary-500/10"
            >
              Perfil
            </Link>
            {!isSelf ? (
              <Link
                href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
                className="eid-btn-primary flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold"
              >
                Match
              </Link>
            ) : (
              <span className="flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-center text-xs font-semibold text-eid-text-secondary">
                Você
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
