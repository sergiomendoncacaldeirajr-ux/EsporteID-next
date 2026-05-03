"use client";

import { Trophy } from "lucide-react";
import { goalsRequiresPenaltyShootoutSection } from "@/lib/match-scoring";
import { ScoreCounter } from "./score-counter";

type Score = { a: number; b: number; overtimeA?: number; overtimeB?: number; penaltiesA?: number; penaltiesB?: number };

type Props = {
  score: Score;
  onChange: (next: Score) => void;
  sideALabel: string;
  sideBLabel: string;
  sideAAvatarUrl?: string | null;
  sideBAvatarUrl?: string | null;
  sideAAvatarEhFormacao?: boolean;
  sideBAvatarEhFormacao?: boolean;
  hasOvertime: boolean;
  hasPenalties: boolean;
};

const penaltyShootoutPanelClass =
  "mt-3 rounded-lg border border-eid-primary-500/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_14%,transparent),color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)_95%))] px-2.5 py-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)]";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function SideFace({
  name,
  avatarUrl,
  ehFormacao,
  sizeClass,
}: {
  name: string;
  avatarUrl?: string | null;
  ehFormacao?: boolean;
  sizeClass: string;
}) {
  const round = ehFormacao ? "rounded-xl" : "rounded-full";
  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-fg ${round}`}
    >
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
    </span>
  );
}

function withPenaltiesClearedIfNotNeeded(next: Score, hasOvertime: boolean, hasPenalties: boolean): Score {
  const cfg = { hasOvertime, hasPenalties };
  if (!goalsRequiresPenaltyShootoutSection(cfg, next)) {
    return { ...next, penaltiesA: 0, penaltiesB: 0 };
  }
  return next;
}

export function GoalsScore({
  score,
  onChange,
  sideALabel,
  sideBLabel,
  sideAAvatarUrl = null,
  sideBAvatarUrl = null,
  sideAAvatarEhFormacao = false,
  sideBAvatarEhFormacao = false,
  hasOvertime,
  hasPenalties,
}: Props) {
  const showPenalties = goalsRequiresPenaltyShootoutSection({ hasOvertime, hasPenalties }, score);

  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] p-2.5">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <SideFace name={sideALabel} avatarUrl={sideAAvatarUrl} ehFormacao={sideAAvatarEhFormacao} sizeClass="h-10 w-10" />
            <p className="line-clamp-2 w-full text-left text-xs font-bold leading-tight text-eid-fg">{sideALabel}</p>
          </div>
          <div className="shrink-0 self-center">
            <ScoreCounter
              value={score.a}
              onChange={(next) => onChange(withPenaltiesClearedIfNotNeeded({ ...score, a: next }, hasOvertime, hasPenalties))}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] p-2.5">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <SideFace name={sideBLabel} avatarUrl={sideBAvatarUrl} ehFormacao={sideBAvatarEhFormacao} sizeClass="h-10 w-10" />
            <p className="line-clamp-2 w-full text-left text-xs font-bold leading-tight text-eid-fg">{sideBLabel}</p>
          </div>
          <div className="shrink-0 self-center">
            <ScoreCounter
              value={score.b}
              onChange={(next) => onChange(withPenaltiesClearedIfNotNeeded({ ...score, b: next }, hasOvertime, hasPenalties))}
            />
          </div>
        </div>
      </div>
      {hasOvertime ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Prorrogação A</span>
            <ScoreCounter
              value={score.overtimeA ?? 0}
              onChange={(next) =>
                onChange(withPenaltiesClearedIfNotNeeded({ ...score, overtimeA: next }, hasOvertime, hasPenalties))
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-eid-text-secondary">Prorrogação B</span>
            <ScoreCounter
              value={score.overtimeB ?? 0}
              onChange={(next) =>
                onChange(withPenaltiesClearedIfNotNeeded({ ...score, overtimeB: next }, hasOvertime, hasPenalties))
              }
            />
          </label>
        </div>
      ) : null}
      {showPenalties ? (
        <div className={penaltyShootoutPanelClass}>
          <div className="flex items-center gap-1.5 text-eid-primary-300">
            <Trophy className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Disputa por pênaltis</p>
          </div>
          <p className="mt-1 text-[10px] font-medium leading-snug text-eid-text-secondary">
            Placar empatado no tempo regulamentar. Informe os gols convertidos nos pênaltis para definir o vencedor (não pode
            empatar).
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-2">
              <div className="flex min-w-0 flex-col items-start gap-1">
                <SideFace name={sideALabel} avatarUrl={sideAAvatarUrl} ehFormacao={sideAAvatarEhFormacao} sizeClass="h-8 w-8" />
                <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-eid-text-secondary">
                  Pênaltis
                </span>
                <span className="line-clamp-2 text-left text-[11px] font-bold text-eid-fg">{sideALabel}</span>
              </div>
              <div className="shrink-0 self-center">
                <ScoreCounter value={score.penaltiesA ?? 0} onChange={(next) => onChange({ ...score, penaltiesA: next })} />
              </div>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-2">
              <div className="flex min-w-0 flex-col items-start gap-1">
                <SideFace name={sideBLabel} avatarUrl={sideBAvatarUrl} ehFormacao={sideBAvatarEhFormacao} sizeClass="h-8 w-8" />
                <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-eid-text-secondary">
                  Pênaltis
                </span>
                <span className="line-clamp-2 text-left text-[11px] font-bold text-eid-fg">{sideBLabel}</span>
              </div>
              <div className="shrink-0 self-center">
                <ScoreCounter value={score.penaltiesB ?? 0} onChange={(next) => onChange({ ...score, penaltiesB: next })} />
              </div>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
