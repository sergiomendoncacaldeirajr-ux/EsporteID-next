import Link from "next/link";
import { EidNotaMetric, EidRankingPtsMetric } from "@/components/ui/eid-metrics";

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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
        onlyRank
          ? "border-[color:var(--eid-border-subtle)] bg-eid-surface/90 text-eid-text-secondary"
          : "border-eid-primary-500/28 bg-eid-primary-500/[0.07] text-eid-primary-300"
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
      ? "border-eid-action-500/25 md:border-eid-action-500/35"
      : variant === "podium-2"
        ? "border-[color:var(--eid-border-subtle)] md:border-eid-text-secondary/20"
        : variant === "podium-3"
          ? "border-eid-primary-500/22 md:border-eid-primary-500/32"
          : "border-[color:var(--eid-border-subtle)]";

  const scale = variant === "podium-1" ? "md:scale-[1.02] md:z-10" : "";

  return (
    <article
      className={`relative overflow-hidden rounded-[var(--eid-radius-lg)] border bg-eid-card p-3 shadow-sm transition hover:border-eid-primary-500/35 md:p-3.5 ${ring} ${scale}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 hidden h-20 w-20 rounded-full bg-eid-primary-500/[0.06] blur-2xl md:block" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 gap-2.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] font-bold tabular-nums ${
              podium
                ? "bg-eid-primary-500/15 text-base text-eid-primary-300"
                : "bg-eid-surface text-sm text-eid-primary-300"
            }`}
          >
            {rank}
          </div>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-[12px] border border-[color:var(--eid-border-subtle)] object-cover sm:h-14 sm:w-14" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[color:var(--eid-border-subtle)] bg-eid-surface text-xs font-semibold text-eid-primary-300 sm:h-14 sm:w-14">
              {(nome.trim().slice(0, 2) || "AT").toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-eid-fg">{nome}</p>
            <p className="truncate text-xs text-eid-text-secondary">{esporteNome}</p>
            <p className="mt-0.5 truncate text-xs text-eid-text-secondary">{localizacao}</p>
            <div className="mt-1.5">
              <InteresseChip interesse={interesseMatch} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2.5 sm:w-[13.5rem] sm:shrink-0 sm:border-l sm:border-[color:var(--eid-border-subtle)] sm:pl-3">
          <div className="grid grid-cols-2 gap-2">
            <EidNotaMetric value={eid} size="sm" />
            <EidRankingPtsMetric value={pontos} size="sm" />
          </div>
          <p className="text-center text-[10px] text-eid-text-muted sm:text-right">{partidas} jogos válidos</p>
          <div className="grid grid-cols-2 gap-1.5 text-center text-[11px]">
            <div className="rounded-[8px] border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1">
              <span className="block text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary">Vitórias</span>
              <span className="font-semibold text-eid-fg">{vitorias}</span>
            </div>
            <div className="rounded-[8px] border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1">
              <span className="block text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary">Derrotas</span>
              <span className="font-semibold text-eid-fg">{derrotas}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/perfil/${usuarioId}?from=/ranking`}
              className="flex-1 rounded-[10px] border border-eid-primary-500/35 px-2.5 py-1.5 text-center text-xs font-semibold text-eid-fg transition hover:bg-eid-primary-500/10"
            >
              Perfil
            </Link>
            {!isSelf ? (
              <Link
                href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
                className="eid-btn-primary flex-1 px-2.5 py-1.5 text-center text-xs"
              >
                Match
              </Link>
            ) : (
              <span className="flex-1 rounded-[10px] border border-[color:var(--eid-border-subtle)] px-2.5 py-1.5 text-center text-xs font-medium text-eid-text-secondary">
                Você
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
