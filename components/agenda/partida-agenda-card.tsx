import Link from "next/link";

type Props = {
  id: number;
  esporteNome: string;
  j1Nome: string | null;
  j2Nome: string | null;
  dataRef: string | null;
  localLabel: string | null;
  variant: "agendada" | "placar";
};

function primeiroNome(n: string | null) {
  if (!n?.trim()) return "—";
  return n.trim().split(/\s+/)[0] ?? "—";
}

function formatWhen(iso: string | null) {
  if (!iso) return "Data a combinar";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "Data a combinar";
  }
}

export function PartidaAgendaCard({ id, esporteNome, j1Nome, j2Nome, dataRef, localLabel, variant }: Props) {
  const isPlacar = variant === "placar";
  return (
    <article
      className={`rounded-xl border p-3 shadow-none transition md:rounded-[22px] md:p-4 md:shadow-lg ${
        isPlacar
          ? "border-eid-action-500/30 bg-eid-card md:border-eid-action-500/35 md:bg-gradient-to-br md:from-eid-action-500/12 md:to-eid-card"
          : "border-[color:var(--eid-border-subtle)] bg-eid-card md:shadow-black/20"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-eid-primary-400 md:text-[10px] md:font-black">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>⏱</span>
          {formatWhen(dataRef)}
        </span>
        <span className="ml-auto text-eid-primary-300">{esporteNome}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 md:mt-4">
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{primeiroNome(j1Nome)}</p>
        </div>
        <span className="shrink-0 text-[9px] font-semibold text-eid-text-secondary opacity-50 md:text-[10px] md:font-black">VS</span>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{primeiroNome(j2Nome)}</p>
        </div>
      </div>

      {localLabel ? (
        <p className="mt-3 text-center text-[11px] text-eid-text-secondary">
          📍 <span className="text-eid-fg/90">{localLabel}</span>
        </p>
      ) : null}

      {isPlacar ? (
        <p className="mt-2 hidden text-center text-xs text-eid-text-secondary md:mt-3 md:block">
          O oponente registrou um placar. Confirme ou conteste quando o fluxo estiver disponível.
        </p>
      ) : null}

      <Link
        href={`/registrar-placar/${id}`}
        className="eid-btn-primary mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg text-center text-[11px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:rounded-2xl md:text-xs md:font-black"
      >
        {isPlacar ? "Revisar placar" : "Registrar placar"}
      </Link>
    </article>
  );
}
