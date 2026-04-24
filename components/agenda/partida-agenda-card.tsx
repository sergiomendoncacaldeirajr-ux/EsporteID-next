import Link from "next/link";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";

type Props = {
  id: number;
  esporteNome: string;
  j1Nome: string | null;
  j2Nome: string | null;
  dataRef: string | null;
  localLabel: string | null;
  variant: "agendada" | "placar";
  /** Se omitido: agendada → `?modo=agenda`; placar → página completa. */
  href?: string;
  ctaLabel?: string;
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

const cardBase =
  "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm transition md:p-4";

export function PartidaAgendaCard({ id, esporteNome, j1Nome, j2Nome, dataRef, localLabel, variant, href, ctaLabel }: Props) {
  const isPlacar = variant === "placar";
  const ctaHref =
    href ??
    (isPlacar ? `/registrar-placar/${id}?from=/comunidade` : `/registrar-placar/${id}?modo=agenda`);
  const ctaText = ctaLabel ?? (isPlacar ? "Revisar resultado" : "Agendar data e local");
  return (
    <article
      className={
        isPlacar
          ? `${cardBase} border-[color:color-mix(in_srgb,var(--eid-action-500)_38%,var(--eid-border-subtle)_62%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_24px_-14px_color-mix(in_srgb,var(--eid-action-500)_28%,transparent)]`
          : cardBase
      }
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
          O oponente registrou um placar. Toque em &quot;Revisar placar&quot; para confirmar ou contestar.
        </p>
      ) : null}

      <Link
        href={ctaHref}
        className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-3 text-center text-[11px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:text-xs`}
      >
        <DesafioFlowCtaIcon />
        <span>{ctaText}</span>
      </Link>
    </article>
  );
}
