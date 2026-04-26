"use client";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
};

export function ScoreCounter({ value, onChange, min = 0, max, compact = false }: Props) {
  const decDisabled = value <= min;
  const incDisabled = typeof max === "number" && value >= max;
  const btnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-lg font-black text-eid-fg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45";
  return (
    <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <button type="button" className={btnClass} onClick={() => onChange(Math.max(min, value - 1))} disabled={decDisabled}>
        -
      </button>
      <span className="min-w-7 text-center text-base font-black text-eid-fg">{value}</span>
      <button
        type="button"
        className={btnClass}
        onClick={() => onChange(typeof max === "number" ? Math.min(max, value + 1) : value + 1)}
        disabled={incDisabled}
      >
        +
      </button>
    </div>
  );
}
