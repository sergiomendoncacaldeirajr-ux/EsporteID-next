"use client";

import { ScoreCounter } from "./score-counter";

type RoundItem = { a?: number; b?: number; winner?: "a" | "b" | null };
type Payload = { method: "decision" | "ko" | "tko" | "submission"; winner: "a" | "b"; items: RoundItem[] };

type Props = {
  payload: Payload;
  onChange: (next: Payload) => void;
  sideALabel: string;
  sideBLabel: string;
  maxRounds: number;
};

export function RoundsScore({ payload, onChange, sideALabel, sideBLabel, maxRounds }: Props) {
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Método final</span>
          <select
            value={payload.method}
            onChange={(e) => onChange({ ...payload, method: e.target.value as Payload["method"] })}
            className="eid-input-dark h-[40px] rounded-xl px-3 text-sm text-eid-fg"
          >
            <option value="decision">Decisão por pontos</option>
            <option value="ko">KO</option>
            <option value="tko">TKO</option>
            <option value="submission">Submissão</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Vencedor final</span>
          <select
            value={payload.winner}
            onChange={(e) => onChange({ ...payload, winner: e.target.value as "a" | "b" })}
            className="eid-input-dark h-[40px] rounded-xl px-3 text-sm text-eid-fg"
          >
            <option value="a">{sideALabel}</option>
            <option value="b">{sideBLabel}</option>
          </select>
        </label>
      </div>
      <div className="mt-3 space-y-2">
        {payload.items.slice(0, maxRounds).map((round, idx) => (
          <div key={`round-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] px-2 py-2">
            <p className="text-[11px] font-bold text-eid-text-secondary">Round {idx + 1}</p>
            {payload.method === "decision" ? (
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <ScoreCounter
                  value={round.a ?? 0}
                  onChange={(next) => {
                    const draft = [...payload.items];
                    draft[idx] = { ...draft[idx], a: next };
                    onChange({ ...payload, items: draft });
                  }}
                />
                <ScoreCounter
                  value={round.b ?? 0}
                  onChange={(next) => {
                    const draft = [...payload.items];
                    draft[idx] = { ...draft[idx], b: next };
                    onChange({ ...payload, items: draft });
                  }}
                />
              </div>
            ) : (
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const draft = [...payload.items];
                    draft[idx] = { ...draft[idx], winner: "a" };
                    onChange({ ...payload, items: draft });
                  }}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                    round.winner === "a"
                      ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-300"
                      : "border-[color:var(--eid-border-subtle)] text-eid-fg"
                  }`}
                >
                  {sideALabel} vence round
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const draft = [...payload.items];
                    draft[idx] = { ...draft[idx], winner: "b" };
                    onChange({ ...payload, items: draft });
                  }}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                    round.winner === "b"
                      ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-300"
                      : "border-[color:var(--eid-border-subtle)] text-eid-fg"
                  }`}
                >
                  {sideBLabel} vence round
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
