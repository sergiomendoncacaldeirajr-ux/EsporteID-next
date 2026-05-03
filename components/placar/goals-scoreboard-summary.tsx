import {
  goalsTotalsBeforePenaltiesDisplay,
  resolveGoalsScoreboardVisualStyle,
  type GoalsScoreboardVisualStyle,
  type GoalsScoreFields,
} from "@/lib/match-scoring";

function toN(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

const PANEL: Record<GoalsScoreboardVisualStyle, string> = {
  football:
    "border-emerald-950/40 bg-[linear-gradient(180deg,#0a2218_0%,#145236_48%,#0a2218_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_22px_-12px_rgba(0,0,0,0.55)]",
  ice_hockey:
    "border-sky-800/35 bg-[linear-gradient(180deg,#eef6ff_0%,#d2e8fb_50%,#e8f2fb_100%)] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-sky-500/30 dark:bg-[linear-gradient(180deg,#0c1520_0%,#1a3a4f_48%,#0c1520_100%)] dark:text-slate-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  handball:
    "border-orange-900/40 bg-[linear-gradient(180deg,#1f1209_0%,#3d2414_48%,#1f1209_100%)] text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
  default:
    "border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-surface)_65%,var(--eid-card)_35%)] text-eid-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
};

const X_COLOR: Record<GoalsScoreboardVisualStyle, string> = {
  football: "text-white/55",
  ice_hockey: "text-slate-500 dark:text-slate-300/80",
  handball: "text-amber-200/65",
  default: "text-eid-text-secondary/85",
};

const SUB_COLOR: Record<GoalsScoreboardVisualStyle, string> = {
  football: "text-white/72",
  ice_hockey: "text-slate-600 dark:text-slate-300/75",
  handball: "text-amber-100/75",
  default: "text-eid-text-secondary",
};

function NumWithPenSup({
  main,
  pens,
  showPens,
  numClassName,
}: {
  main: number;
  pens: number;
  showPens: boolean;
  numClassName: string;
}) {
  return (
    <span className={`inline-flex items-start justify-center tabular-nums ${numClassName}`}>
      <span className="leading-none">{main}</span>
      {showPens ? (
        <sup className="ml-0.5 translate-y-0.5 text-[0.42em] font-bold leading-none opacity-95 sm:text-[0.44em]">
          ({pens})
        </sup>
      ) : null}
    </span>
  );
}

export type GoalsScoreboardSummaryProps = {
  goals: GoalsScoreFields;
  sportName?: string | null;
  variant?: "card" | "hero";
  /** Rótulo superior (ex.: "Placar final"). Omitir no card embutido em "Placar atual". */
  caption?: string | null;
  className?: string;
};

export function GoalsScoreboardSummary({
  goals,
  sportName,
  variant = "card",
  caption,
  className = "",
}: GoalsScoreboardSummaryProps) {
  const style = resolveGoalsScoreboardVisualStyle(sportName);
  const regA = toN(goals.a);
  const regB = toN(goals.b);
  const otA = toN(goals.overtimeA);
  const otB = toN(goals.overtimeB);
  const penA = toN(goals.penaltiesA);
  const penB = toN(goals.penaltiesB);
  const beforePens = goalsTotalsBeforePenaltiesDisplay(goals);
  const showOt = otA > 0 || otB > 0;
  const showPen = penA > 0 || penB > 0;

  const numCls =
    variant === "hero"
      ? "text-xl font-black tracking-tight sm:text-2xl"
      : "text-[22px] font-black tracking-tight sm:text-[26px]";
  const xCls = variant === "hero" ? "select-none text-xs font-extrabold sm:text-sm" : "select-none text-sm font-extrabold sm:text-base";
  const pad = variant === "hero" ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-3 py-3 sm:px-4 sm:py-3.5";

  let subParts: string[] = [];
  if (showOt) {
    subParts.push(`Reg. ${regA}×${regB} · Pror. ${otA}×${otB}`);
  } else if (showPen && (regA > 0 || regB > 0 || regA !== beforePens.a || regB !== beforePens.b)) {
    subParts.push(`Tempo de jogo ${regA}×${regB}`);
  } else if (showPen) {
    subParts.push(`Empate no tempo de jogo (${regA}×${regB})`);
  }

  const resolvedCaption = caption === undefined ? (variant === "hero" ? "Placar final" : null) : caption;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${PANEL[style]} ${pad} text-center ${className}`.trim()}
    >
      {style === "football" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(255,255,255,0.09) 11px, rgba(255,255,255,0.09) 12px)",
          }}
          aria-hidden
        />
      ) : null}
      {style === "ice_hockey" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 55% at 50% 120%, rgba(59,130,246,0.35), transparent 62%)",
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-[1]">
        {resolvedCaption ? (
          <p className={`text-[8px] font-black uppercase tracking-[0.14em] ${SUB_COLOR[style]}`}>{resolvedCaption}</p>
        ) : null}
        <p className={`${resolvedCaption ? "mt-1.5" : ""} flex items-start justify-center gap-2 sm:gap-2.5`}>
          <NumWithPenSup main={beforePens.a} pens={penA} showPens={showPen} numClassName={numCls} />
          <span className={`${xCls} ${X_COLOR[style]} translate-y-1`} aria-hidden>
            ×
          </span>
          <NumWithPenSup main={beforePens.b} pens={penB} showPens={showPen} numClassName={numCls} />
        </p>
        {subParts.length ? (
          <p className={`mt-2 text-[10px] font-semibold leading-snug sm:text-[11px] ${SUB_COLOR[style]}`}>{subParts.join(" · ")}</p>
        ) : null}
        {showPen ? (
          <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.12em] opacity-80 ${SUB_COLOR[style]}`}>
            Disputa por pênaltis
          </p>
        ) : null}
      </div>
    </div>
  );
}
