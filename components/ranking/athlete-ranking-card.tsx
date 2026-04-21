import Link from "next/link";
import { EidNotaMetric } from "@/components/ui/eid-metrics";

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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] transition duration-200 ${
        onlyRank
          ? "border-[color:var(--eid-border-subtle)] bg-eid-surface/90 text-eid-text-secondary"
          : "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-300"
      }`}
      title={onlyRank ? "Busca confrontos válidos só para ranking" : "Aceita ranking e jogos amistosos"}
    >
      {onlyRank ? "Só ranking" : "Rank + amistoso"}
    </span>
  );
}

function IconCrown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 18L3 7l5 3 4-6 4 6 5-3-2 11H5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_8px_rgba(74,222,128,0.45)]"
      />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AvatarBlock({
  avatarUrl,
  nome,
  size,
  className,
}: {
  avatarUrl: string | null;
  nome: string;
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const s =
    size === "xl"
      ? "h-24 w-24 md:h-28 md:w-28 rounded-2xl text-lg"
      : size === "lg"
        ? "h-16 w-16 md:h-[4.5rem] md:w-[4.5rem] rounded-2xl text-sm"
        : size === "md"
          ? "h-14 w-14 rounded-xl text-xs"
          : "h-11 w-11 rounded-xl text-[10px]";
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" className={`shrink-0 border border-[color:var(--eid-border-subtle)] object-cover ${s} ${className ?? ""}`} />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-[color:var(--eid-border-subtle)] bg-eid-surface font-bold text-eid-primary-300 ${s} ${className ?? ""}`}
    >
      {(nome.trim().slice(0, 2) || "AT").toUpperCase()}
    </div>
  );
}

export function AthleteRankingCard(props: AthleteRankingCardProps) {
  if (props.variant === "podium-1") return <PodiumFirst {...props} />;
  if (props.variant === "podium-2" || props.variant === "podium-3") return <PodiumSide {...props} />;
  return <ListRankingCard {...props} />;
}

function PodiumFirst({
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
}: AthleteRankingCardProps) {
  const isSelf = viewerId === usuarioId;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-eid-primary-500/30 bg-gradient-to-b from-eid-card via-eid-card to-eid-primary-950/35 p-5 shadow-[0_8px_32px_-12px_rgba(74,222,128,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 ease-out hover:border-eid-primary-500/45 hover:shadow-[0_12px_40px_-10px_rgba(74,222,128,0.18)] md:rounded-3xl md:p-6">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-eid-primary-500/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-eid-bg/80 to-transparent" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-7 items-center justify-center text-eid-primary-400">
            <IconCrown className="h-6 w-6" />
          </div>
          <div className="relative">
            <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-eid-primary-400/28 via-transparent to-eid-primary-600/18 opacity-80 blur-[2px]" />
            <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="xl" className="relative ring-2 ring-eid-primary-500/45 ring-offset-2 ring-offset-eid-card" />
          </div>
        </div>

        <div className="flex w-full max-w-[17rem] flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-primary-400">1º lugar</p>
          <h3 className="truncate text-lg font-bold leading-tight text-eid-fg md:text-xl">{nome}</h3>
          <p className="pt-1 text-3xl font-black tabular-nums leading-none text-eid-primary-300 md:text-4xl">{pontos}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eid-text-secondary">pontos de ranking</p>
          <p className="truncate text-xs text-eid-text-secondary">{localizacao}</p>
          <p className="text-[11px] font-medium text-eid-text-muted">{esporteNome}</p>
          <div className="pt-1">
            <InteresseChip interesse={interesseMatch} />
          </div>
        </div>

        <div className="w-full max-w-xs space-y-1.5">
          <EidNotaMetric value={eid} size="md" />
          <p className="text-[10px] text-eid-text-muted">{partidas} jogos válidos · {vitorias}V · {derrotas}D</p>
        </div>

        <div className="flex w-full max-w-xs gap-2">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/[0.06] px-3 text-xs font-bold text-eid-fg transition duration-200 hover:bg-eid-primary-500/12"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-3 text-xs font-bold transition duration-200 active:scale-[0.98]"
            >
              Match
            </Link>
          ) : (
            <span className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-xs font-semibold text-eid-text-secondary">
              Você
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function PodiumSide(props: AthleteRankingCardProps) {
  const { rank, nome, avatarUrl, localizacao, esporteNome, eid, vitorias, derrotas, pontos, partidas, usuarioId, esporteId, interesseMatch, viewerId, variant } =
    props;
  const isSelf = viewerId === usuarioId;
  const label = rank === 2 ? "2º lugar" : "3º lugar";
  const borderAccent =
    variant === "podium-2"
      ? "border-eid-primary-500/25 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]"
      : "border-eid-primary-500/20 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]";

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-eid-card to-eid-bg/80 p-4 transition duration-300 ease-out hover:border-eid-primary-500/35 md:rounded-2xl md:p-4 ${borderAccent}`}
    >
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-eid-primary-500/[0.06] blur-2xl" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-eid-text-secondary">{label}</p>
        <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="lg" />
        <div className="flex w-full max-w-[12rem] flex-col gap-0.5">
          <h3 className="truncate text-sm font-bold text-eid-fg">{nome}</h3>
          <p className="text-xl font-black tabular-nums leading-none text-eid-primary-300">{pontos}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-eid-text-secondary">pontos</p>
        </div>
        <div className="flex max-w-[12rem] flex-col gap-0.5">
          <p className="line-clamp-2 text-[11px] leading-snug text-eid-text-secondary">{localizacao}</p>
          <p className="text-[10px] text-eid-text-muted">{esporteNome}</p>
        </div>
        <InteresseChip interesse={interesseMatch} />
        <div className="w-full space-y-1">
          <EidNotaMetric value={eid} size="sm" />
          <p className="text-[9px] tabular-nums text-eid-text-muted">
            {partidas} jogos · {vitorias}V · {derrotas}D
          </p>
        </div>
        <div className="flex w-full gap-2">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-eid-primary-500/28 text-[11px] font-semibold text-eid-fg transition duration-200 hover:bg-eid-primary-500/10"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary flex min-h-[40px] flex-1 items-center justify-center rounded-xl text-[11px] font-bold"
            >
              Match
            </Link>
          ) : (
            <span className="flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] text-[11px] text-eid-text-secondary">
              Você
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ListRankingCard({
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
}: AthleteRankingCardProps) {
  const isSelf = viewerId === usuarioId;
  return (
    <article className="group rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/95 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.28)] transition duration-200 ease-out hover:border-eid-primary-500/28 hover:shadow-[0_6px_24px_-8px_rgba(74,222,128,0.1)] md:rounded-[1.25rem]">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4 md:flex-row md:items-center md:gap-6 md:px-5 md:pb-4 md:pt-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-eid-primary-500/30 bg-eid-surface text-[0.8125rem] font-black tabular-nums text-eid-primary-300 transition duration-200 group-hover:border-eid-primary-500/45 md:h-[3.25rem] md:w-[3.25rem] md:text-base"
            aria-label={`Posição ${rank}`}
          >
            {rank}
          </div>
          <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="md" className="md:h-[3.5rem] md:w-[3.5rem]" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[0.9375rem] font-bold leading-tight tracking-tight text-eid-fg md:text-base">{nome}</p>
            <p className="truncate text-xs text-eid-text-secondary">{localizacao}</p>
            <p className="truncate text-[11px] text-eid-text-muted">{esporteNome}</p>
            <InteresseChip interesse={interesseMatch} />
          </div>
        </div>

        <div className="flex w-full shrink-0 justify-end border-t border-white/[0.06] pt-3 md:w-[7.25rem] md:flex-col md:items-end md:justify-start md:border-t-0 md:border-l md:border-white/[0.06] md:pl-6 md:pt-0">
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Pontos</p>
            <p className="text-2xl font-black tabular-nums leading-none text-eid-primary-300 md:text-[1.75rem]">{pontos}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-eid-surface/25 px-4 py-3.5 md:px-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-md">
            <EidNotaMetric value={eid} size="sm" />
          </div>
          <p className="shrink-0 text-[10px] tabular-nums text-eid-text-muted sm:text-right">
            {partidas} jogos · {vitorias}V · {derrotas}D
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-eid-primary-500/30 px-3 text-xs font-bold text-eid-fg transition duration-200 hover:bg-eid-primary-500/[0.08] active:scale-[0.98]"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-3 text-xs font-bold transition duration-200 active:scale-[0.98]"
            >
              Match
            </Link>
          ) : (
            <span className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-xs font-semibold text-eid-text-secondary">
              Você
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
