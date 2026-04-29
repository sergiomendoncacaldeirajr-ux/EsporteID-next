import type { HTMLAttributes } from "react";

export type EidSealPillVariant = "default" | "compact" | "emphasis" | "ranking" | "ranking-tight";

type Variant = EidSealPillVariant;

const variantClass: Record<
  Variant,
  { wrap: string; label: string; score: string }
> = {
  default: {
    wrap: "text-[10px]",
    label: "flex items-center rounded-l-full bg-[var(--eid-seal-label-bg)] px-[7px] py-px uppercase tracking-wide text-[var(--eid-seal-label-fg)]",
    score:
      "flex items-center rounded-r-full bg-[var(--eid-seal-score-bg)] px-[7px] py-px tabular-nums text-[var(--eid-seal-score-fg)]",
  },
  /** Entre compact e default — ex.: carrossel Performance EID no perfil. */
  emphasis: {
    wrap: "text-[8px] sm:text-[8.5px]",
    label:
      "flex items-center rounded-l-full bg-[var(--eid-seal-label-bg)] px-[6px] py-[3px] uppercase tracking-wide text-[var(--eid-seal-label-fg)] sm:px-[7px]",
    score:
      "flex items-center rounded-r-full bg-[var(--eid-seal-score-bg)] px-[6px] py-[3px] tabular-nums text-[var(--eid-seal-score-fg)] sm:px-[7px]",
  },
  compact: {
    wrap: "text-[6px] sm:text-[6.5px]",
    label:
      "flex items-center rounded-l-full bg-[var(--eid-seal-label-bg)] px-[4px] py-px uppercase tracking-wide text-[var(--eid-seal-label-fg)] sm:px-[4.5px]",
    score:
      "flex items-center rounded-r-full bg-[var(--eid-seal-score-bg)] px-[4px] py-px tabular-nums text-[var(--eid-seal-score-fg)] sm:px-[4.5px]",
  },
  ranking: {
    wrap: "text-[6px]",
    label:
      "flex items-center rounded-l-full bg-[var(--eid-seal-label-bg)] px-[3px] py-px pl-[4px] uppercase tracking-wide text-[var(--eid-seal-label-fg)]",
    score:
      "flex items-center rounded-r-full bg-[var(--eid-seal-score-bg)] px-[3px] py-px pr-[4px] tabular-nums text-[var(--eid-seal-score-fg)]",
  },
  "ranking-tight": {
    wrap: "text-[5px]",
    label:
      "flex items-center rounded-l-full bg-[var(--eid-seal-label-bg)] px-[2px] py-0 pl-[2px] uppercase tracking-wide text-[var(--eid-seal-label-fg)]",
    score:
      "flex items-center rounded-r-full bg-[var(--eid-seal-score-bg)] px-[2px] py-0 pr-[2px] tabular-nums text-[var(--eid-seal-score-fg)]",
  },
};

type Props = HTMLAttributes<HTMLDivElement> & {
  value: number;
  variant?: Variant;
};

export function EidSealPill({ value, variant = "default", className = "", ...rest }: Props) {
  const v = (Number.isFinite(value) ? value : 0).toFixed(1);
  const c = variantClass[variant];
  return (
    <div
      className={`inline-flex items-stretch rounded-full border border-[color:var(--eid-seal-border)] font-black leading-none shadow-[var(--eid-seal-shadow)] ${c.wrap} ${className}`.trim()}
      {...rest}
    >
      <span className={c.label}>EID</span>
      <span className={c.score}>{v}</span>
    </div>
  );
}
