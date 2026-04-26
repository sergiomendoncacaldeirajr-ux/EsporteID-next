"use client";

import { ScoreCounter } from "./score-counter";

type Score = { a: number; b: number; overtimeA?: number; overtimeB?: number; penaltiesA?: number; penaltiesB?: number };

type Props = {
  score: Score;
  onChange: (next: Score) => void;
  sideALabel: string;
  sideBLabel: string;
  hasOvertime: boolean;
  hasPenalties: boolean;
};

export function GoalsScore({ score, onChange, sideALabel, sideBLabel, hasOvertime, hasPenalties }: Props) {
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] p-2 text-center">
          <p className="text-xs font-bold text-eid-fg">{sideALabel}</p>
          <div className="mt-1 flex justify-center">
            <ScoreCounter value={score.a} onChange={(next) => onChange({ ...score, a: next })} />
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] p-2 text-center">
          <p className="text-xs font-bold text-eid-fg">{sideBLabel}</p>
          <div className="mt-1 flex justify-center">
            <ScoreCounter value={score.b} onChange={(next) => onChange({ ...score, b: next })} />
          </div>
        </div>
      </div>
      {hasOvertime ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Prorrogação A</span>
            <ScoreCounter value={score.overtimeA ?? 0} onChange={(next) => onChange({ ...score, overtimeA: next })} />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Prorrogação B</span>
            <ScoreCounter value={score.overtimeB ?? 0} onChange={(next) => onChange({ ...score, overtimeB: next })} />
          </label>
        </div>
      ) : null}
      {hasPenalties ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Pênaltis A</span>
            <ScoreCounter value={score.penaltiesA ?? 0} onChange={(next) => onChange({ ...score, penaltiesA: next })} />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Pênaltis B</span>
            <ScoreCounter value={score.penaltiesB ?? 0} onChange={(next) => onChange({ ...score, penaltiesB: next })} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
