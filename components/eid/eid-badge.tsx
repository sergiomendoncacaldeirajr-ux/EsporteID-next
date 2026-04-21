type EidBadgeEntry = {
  change_amount?: number | string | null;
  reason?: string | null;
  created_at?: string | null;
  esportes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fmtDelta(value: number) {
  const abs = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "-"}${abs}`;
}

function fmtData(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildTooltip(history: EidBadgeEntry[]) {
  if (!history.length) return "Sem alterações recentes de EID.";
  return history
    .map((item) => {
      const delta = Number(item.change_amount ?? 0);
      const esporte = firstOf(item.esportes)?.nome;
      const quando = fmtData(item.created_at);
      return [fmtDelta(delta), item.reason ?? "Ajuste automático", esporte, quando].filter(Boolean).join(" · ");
    })
    .join("\n");
}

export function EidBadge({
  score,
  history = [],
  label = "EID",
  className = "",
}: {
  score: number;
  history?: EidBadgeEntry[];
  label?: string;
  className?: string;
}) {
  const safeScore = Number.isFinite(score) ? score : 0;
  return (
    <span
      title={buildTooltip(history)}
      className={`inline-flex items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-eid-action-400 ${className}`.trim()}
    >
      <span>{label}</span>
      <span className="tabular-nums text-eid-fg">{safeScore.toFixed(2)}</span>
    </span>
  );
}
