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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition duration-200 ${
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
    <article className="group relative overflow-hidden rounded-2xl border border-eid-primary-500/35 bg-gradient-to-b from-eid-card via-eid-card to-eid-primary-950/40 p-5 shadow-[0_12px_40px_-8px_rgba(74,222,128,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 ease-out hover:border-eid-primary-500/50 hover:shadow-[0_16px_48px_-6px_rgba(74,222,128,0.22)] md:rounded-3xl md:p-6">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-eid-primary-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-eid-bg/80 to-transparent" />

      <div className="relative flex flex-col items-center text-center">
        <div className="mb-1 flex h-8 items-center justify-center text-eid-primary-400">
          <IconCrown className="h-7 w-7" />
        </div>
        <div className="relative">
          <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-eid-primary-400/30 via-transparent to-eid-primary-600/20 opacity-80 blur-[2px]" />
          <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="xl" className="relative ring-2 ring-eid-primary-500/50 ring-offset-2 ring-offset-eid-card" />
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-eid-primary-400">1º lugar</p>
        <h3 className="mt-1 max-w-[14rem] truncate text-lg font-bold leading-tight text-eid-fg md:text-xl">{nome}</h3>
        <p className="mt-2 text-3xl font-black tabular-nums leading-none text-eid-primary-300 drop-shadow-sm md:text-4xl">{pontos}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-eid-text-secondary">pontos de ranking</p>
        <p className="mt-2 max-w-[16rem] truncate text-xs text-eid-text-secondary">{localizacao}</p>
        <p className="mt-0.5 text-[11px] font-medium text-eid-text-muted">{esporteNome}</p>
        <div className="mt-3">
          <InteresseChip interesse={interesseMatch} />
        </div>

        <div className="mt-5 w-full max-w-xs">
          <EidNotaMetric value={eid} size="md" />
        </div>
        <p className="mt-2 text-[10px] text-eid-text-muted">{partidas} jogos válidos</p>

        <div className="mt-3 grid w-full max-w-xs grid-cols-2 gap-2 text-center text-[11px]">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 py-2 transition duration-200 group-hover:border-eid-primary-500/20">
            <span className="block text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary">Vitórias</span>
            <span className="font-bold text-eid-fg">{vitorias}</span>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 py-2 transition duration-200 group-hover:border-eid-primary-500/20">
            <span className="block text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary">Derrotas</span>
            <span className="font-bold text-eid-fg">{derrotas}</span>
          </div>
        </div>

        <div className="mt-4 flex w-full max-w-xs flex-wrap gap-2">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="flex-1 rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/5 px-3 py-2.5 text-center text-xs font-bold text-eid-fg transition duration-200 hover:bg-eid-primary-500/15"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-bold transition duration-200 active:scale-[0.98]"
            >
              Match
            </Link>
          ) : (
            <span className="flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 text-center text-xs font-semibold text-eid-text-secondary">
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
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-eid-primary-500/[0.07] blur-2xl" />
      <div className="relative flex flex-col items-center text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-eid-text-secondary">{label}</p>
        <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="lg" className="mt-2" />
        <h3 className="mt-2 max-w-[11rem] truncate text-sm font-bold text-eid-fg">{nome}</h3>
        <p className="mt-2 text-xl font-black tabular-nums text-eid-primary-300">{pontos}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-eid-text-secondary">pontos</p>
        <p className="mt-1.5 line-clamp-2 max-w-[12rem] text-[11px] leading-snug text-eid-text-secondary">{localizacao}</p>
        <p className="mt-0.5 text-[10px] text-eid-text-muted">{esporteNome}</p>
        <div className="mt-2">
          <InteresseChip interesse={interesseMatch} />
        </div>
        <div className="mt-3 w-full">
          <EidNotaMetric value={eid} size="sm" />
        </div>
        <p className="mt-1 text-[9px] text-eid-text-muted">{partidas} jogos</p>
        <div className="mt-2 grid w-full grid-cols-2 gap-1 text-[10px]">
          <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 py-1">
            <span className="text-eid-text-secondary">V </span>
            <span className="font-bold text-eid-fg">{vitorias}</span>
          </div>
          <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 py-1">
            <span className="text-eid-text-secondary">D </span>
            <span className="font-bold text-eid-fg">{derrotas}</span>
          </div>
        </div>
        <div className="mt-3 flex w-full gap-1.5">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="flex-1 rounded-lg border border-eid-primary-500/30 py-2 text-center text-[11px] font-semibold text-eid-fg transition duration-200 hover:bg-eid-primary-500/10"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary flex-1 rounded-lg py-2 text-center text-[11px] font-bold"
            >
              Match
            </Link>
          ) : (
            <span className="flex-1 rounded-lg border border-[color:var(--eid-border-subtle)] py-2 text-center text-[11px] text-eid-text-secondary">Você</span>
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
    <article className="group rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:border-eid-primary-500/30 hover:shadow-[0_8px_32px_-10px_rgba(74,222,128,0.12)] md:rounded-[1.25rem]">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
        <div className="flex flex-1 items-center gap-3.5 min-w-0">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-eid-primary-500/35 bg-eid-surface text-base font-black tabular-nums text-eid-primary-300 shadow-inner transition duration-200 group-hover:border-eid-primary-500/50 md:h-14 md:w-14 md:text-lg"
            aria-label={`Posição ${rank}`}
          >
            {rank}
          </div>
          <AvatarBlock avatarUrl={avatarUrl} nome={nome} size="md" className="md:h-[3.75rem] md:w-[3.75rem]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold tracking-tight text-eid-fg md:text-[1.05rem]">{nome}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-eid-text-secondary">{localizacao}</p>
            <p className="mt-0.5 truncate text-[11px] text-eid-text-muted">{esporteNome}</p>
            <div className="mt-2">
              <InteresseChip interesse={interesseMatch} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-4 border-t border-[color:var(--eid-border-subtle)] pt-3 md:w-auto md:flex-col md:items-end md:border-t-0 md:border-l md:pl-5 md:pt-0">
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Pontos</p>
            <p className="text-2xl font-black tabular-nums leading-none text-eid-primary-300 md:text-3xl">{pontos}</p>
            <p className="mt-1 text-[10px] text-eid-text-muted">
              EID <span className="font-semibold text-eid-fg/90">{eid.toFixed(1)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--eid-border-subtle)]/80 bg-eid-surface/30 px-4 py-3 md:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:gap-3">
            <EidNotaMetric value={eid} size="sm" />
            <EidRankingPtsMetric value={pontos} size="sm" />
          </div>
          <p className="text-center text-[10px] text-eid-text-muted sm:text-right">{partidas} jogos válidos</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2 text-center text-[11px] transition duration-200 hover:border-eid-primary-500/15">
            <span className="block text-[8px] font-semibold uppercase text-eid-text-secondary">Vitórias</span>
            <span className="font-bold text-eid-fg">{vitorias}</span>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2 text-center text-[11px] transition duration-200 hover:border-eid-primary-500/15">
            <span className="block text-[8px] font-semibold uppercase text-eid-text-secondary">Derrotas</span>
            <span className="font-bold text-eid-fg">{derrotas}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/perfil/${usuarioId}?from=/ranking`}
            className="min-h-[44px] flex-1 rounded-xl border border-eid-primary-500/35 px-3 py-2.5 text-center text-xs font-bold text-eid-fg transition duration-200 hover:bg-eid-primary-500/10 active:scale-[0.98]"
          >
            Perfil
          </Link>
          {!isSelf ? (
            <Link
              href={`/desafio?id=${encodeURIComponent(usuarioId)}&tipo=individual&esporte=${esporteId}`}
              className="eid-btn-primary min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-bold transition duration-200 active:scale-[0.98]"
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
