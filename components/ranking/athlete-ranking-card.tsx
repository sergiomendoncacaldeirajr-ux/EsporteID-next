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
    <article className="group relative overflow-hidden rounded-[var(--eid-radius-lg)] border border-eid-primary-500/28 bg-gradient-to-b from-eid-card via-eid-card to-eid-primary-950/40 p-4 shadow-[0_10px_36px_-14px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 ease-out hover:border-eid-primary-500/42 hover:shadow-[0_14px_44px_-12px_rgba(37,99,235,0.28)] sm:rounded-2xl sm:p-5 md:rounded-3xl md:p-6">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-eid-primary-500/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-eid-bg/85 to-transparent" />

      <div className="relative flex flex-col items-center gap-4 text-center sm:gap-5">
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex h-6 items-center justify-center text-eid-primary-400">
            <IconCrown className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-eid-primary-400/22 via-transparent to-eid-primary-700/15 opacity-90 blur-[2px]" />
            <div className="relative">
              <AvatarBlock
                avatarUrl={avatarUrl}
                nome={nome}
                size="xl"
                className="relative rounded-full ring-2 ring-eid-primary-500/40 ring-offset-[3px] ring-offset-eid-card"
              />
              <span className="absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full border border-eid-primary-500/35 bg-eid-surface px-2 py-0.5 text-[10px] font-black tabular-nums text-eid-primary-300 shadow-sm">
                1º
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-[17rem] flex-col gap-1.5">
          <h3 className="truncate text-base font-bold leading-tight text-eid-fg sm:text-lg md:text-xl">{nome}</h3>
          <p className="text-2xl font-black tabular-nums leading-none text-eid-primary-300 sm:text-3xl md:text-4xl">{pontos}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eid-text-secondary">pts ranking</p>
          <p className="truncate text-xs text-eid-text-secondary">{localizacao}</p>
          <p className="truncate text-[11px] text-eid-text-muted">{esporteNome}</p>
          <div className="flex justify-center pt-0.5">
            <InteresseChip interesse={interesseMatch} />
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <EidNotaMetric value={eid} size="md" />
          <p className="text-[10px] tabular-nums text-eid-text-muted">{partidas} jogos válidos · {vitorias}V · {derrotas}D</p>
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
  const badgeLabel = rank === 2 ? "2º" : "3º";
  const borderAccent =
    variant === "podium-2"
      ? "border-eid-primary-500/22 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.5)]"
      : "border-[color:var(--eid-border-subtle)] shadow-[0_8px_28px_-14px_rgba(0,0,0,0.5)]";

  return (
    <article
      className={`group relative overflow-hidden rounded-[var(--eid-radius-lg)] border bg-gradient-to-b from-eid-card to-eid-bg/90 p-3 transition duration-300 ease-out hover:border-eid-primary-500/32 sm:rounded-2xl sm:p-4 ${borderAccent}`}
    >
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-eid-primary-500/[0.05] blur-2xl" />
      <div className="relative flex flex-col items-center gap-3 text-center sm:gap-3.5">
        <div className="relative">
          <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="lg" className="rounded-full border-2 border-[color:var(--eid-border-subtle)]" />
          <span
            className={`absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-black tabular-nums shadow-sm ${
              variant === "podium-2"
                ? "border-white/12 bg-eid-surface text-eid-text-secondary"
                : "border-eid-primary-500/25 bg-eid-surface text-eid-primary-300/90"
            }`}
          >
            {badgeLabel}
          </span>
        </div>
        <div className="flex w-full max-w-[12rem] flex-col gap-0.5">
          <h3 className="truncate text-xs font-bold text-eid-fg sm:text-sm">{nome}</h3>
          <p className="text-lg font-black tabular-nums leading-none text-eid-primary-300 sm:text-xl">{pontos}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-eid-text-secondary">pts</p>
        </div>
        <div className="flex max-w-[12rem] flex-col gap-0.5">
          <p className="line-clamp-2 text-[10px] leading-snug text-eid-text-secondary sm:text-[11px]">{localizacao}</p>
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
    <article className="group overflow-hidden rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_4px_20px_-8px_rgba(0,0,0,0.45)] transition duration-200 ease-out hover:border-eid-primary-500/25 hover:shadow-[0_8px_28px_-10px_rgba(37,99,235,0.12)] sm:rounded-2xl">
      <div className="flex items-center gap-3 px-4 py-4 md:gap-4 md:px-5 md:py-5">
        <span
          className="w-10 shrink-0 text-center text-2xl font-black tabular-nums leading-none text-eid-primary-300 sm:w-11 sm:text-[1.75rem] md:text-[2rem]"
          aria-label={`Posição ${rank}`}
        >
          {rank}º
        </span>
        <AvatarBlock
          avatarUrl={avatarUrl}
          nome={nome}
          size="md"
          className="h-12 w-12 shrink-0 rounded-full border-2 border-[color:var(--eid-border-subtle)] md:h-[3.25rem] md:w-[3.25rem]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-bold leading-snug text-eid-fg">{nome}</p>
          <p className="mt-0.5 truncate text-xs leading-normal text-eid-text-secondary">{localizacao}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-black tabular-nums leading-none text-eid-primary-300 sm:text-[1.85rem]">{pontos}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">PTS</p>
        </div>
      </div>

      <div className="space-y-3 border-t border-[color:var(--eid-border-subtle)] bg-eid-surface/20 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="min-w-0 truncate text-[11px] text-eid-text-muted">{esporteNome}</span>
          <InteresseChip interesse={interesseMatch} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-md">
            <EidNotaMetric value={eid} size="sm" />
          </div>
          <p className="shrink-0 text-[10px] tabular-nums text-eid-text-muted sm:text-right">
            {partidas} jogos · {vitorias}V · {derrotas}D
          </p>
        </div>
        <div className="flex gap-2">
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
