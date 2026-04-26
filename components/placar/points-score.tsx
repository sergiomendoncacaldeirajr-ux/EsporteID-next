"use client";

import { ScoreCounter } from "./score-counter";

type Score = { a: number; b: number };

type Props = {
  score: Score;
  onChange: (next: Score) => void;
  sideALabel: string;
  sideBLabel: string;
  pointsLimit?: number | null;
};

export function PointsScore({ score, onChange, sideALabel, sideBLabel, pointsLimit }: Props) {
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] p-2 text-center">
          <p className="text-xs font-bold text-eid-fg">{sideALabel}</p>
          <div className="mt-1 flex justify-center">
            <ScoreCounter value={score.a} max={pointsLimit ?? undefined} onChange={(next) => onChange({ ...score, a: next })} />
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] p-2 text-center">
          <p className="text-xs font-bold text-eid-fg">{sideBLabel}</p>
          <div className="mt-1 flex justify-center">
            <ScoreCounter value={score.b} max={pointsLimit ?? undefined} onChange={(next) => onChange({ ...score, b: next })} />
          </div>
        </div>
      </div>
    </div>
  );
}
