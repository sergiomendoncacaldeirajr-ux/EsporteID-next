/**
 * Métricas EsporteID — Nota EID (avaliação técnica) vs pontos de ranking (desafios).
 * Visual minimalista: azul estrutural vs laranja ação (marca).
 */

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19V5" strokeLinecap="round" />
      <path d="M4 19h16" strokeLinecap="round" />
      <path d="M8 16v-3M12 16V8M16 16v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4Z" strokeLinejoin="round" />
      <path d="M6 7H4a2 2 0 0 0 2 2M18 7h2a2 2 0 0 1-2 2" strokeLinecap="round" />
    </svg>
  );
}

type NotaProps = {
  value: number;
  label?: string;
  size?: "sm" | "md";
};

/** Nota EID — indicador técnico (azul marca). */
export function EidNotaMetric({ value, label = "Nota EID", size = "md" }: NotaProps) {
  const numCls = size === "sm" ? "text-base font-semibold tabular-nums" : "text-xl font-semibold tabular-nums sm:text-2xl";
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] border border-eid-primary-500/28 bg-eid-primary-500/[0.07] px-2.5 py-1.5"
      title="Avaliação técnica EID no esporte"
    >
      <IconChart className="h-4 w-4 shrink-0 text-eid-primary-400" />
      <div className="min-w-0 text-left">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-eid-primary-300/90">{label}</p>
        <p className={`leading-none text-eid-fg ${numCls}`}>{value.toFixed(1)}</p>
      </div>
    </div>
  );
}

type PtsProps = {
  value: number;
  label?: string;
  size?: "sm" | "md";
};

/** Pontos de ranking por desafios — progressão competitiva (laranja marca). */
export function EidRankingPtsMetric({ value, label = "Pts ranking", size = "md" }: PtsProps) {
  const numCls = size === "sm" ? "text-sm font-semibold tabular-nums" : "text-base font-semibold tabular-nums sm:text-lg";
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] border border-eid-action-500/35 bg-eid-action-500/[0.08] px-2.5 py-1.5"
      title="Pontos acumulados no ranking por desafios"
    >
      <IconTrophy className="h-4 w-4 shrink-0 text-eid-action-400" />
      <div className="min-w-0 text-left">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-eid-action-400">{label}</p>
        <p className={`leading-none text-eid-action-500 ${numCls}`}>{value}</p>
      </div>
    </div>
  );
}
