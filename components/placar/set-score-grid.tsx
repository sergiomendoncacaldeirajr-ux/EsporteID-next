"use client";

import { Trophy } from "lucide-react";
import type { MatchUIConfig } from "@/lib/match-scoring";
import {
  evaluateSetForConfig,
  isProSet8Format,
  maxGamesMelhorDe3RegularSet,
  maxGamesProSet8,
  syncSetGamesFromTiebreak,
} from "@/lib/match-scoring";
import { ScoreCounter } from "./score-counter";

type SetItem = { a: number; b: number; tiebreakA?: number; tiebreakB?: number };

type Props = {
  config: MatchUIConfig;
  sets: SetItem[];
  onChange: (sets: SetItem[]) => void;
  sideALabel: string;
  sideBLabel: string;
  sideAAvatarUrl?: string | null;
  sideBAvatarUrl?: string | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Pro set 8: TB decisivo só em 8×8; após fechar, mantém 9×8 / 8×9 para edição do TB. */
function shouldShowPro8DecisiveTiebreak(set: SetItem, gamesPerSet: number): boolean {
  const g = gamesPerSet;
  return (set.a === g && set.b === g) || (set.a === g + 1 && set.b === g) || (set.a === g && set.b === g + 1);
}

/** Ao mudar games: se entrou em 8×8 vindo de outro placar (ex.: baixou de 9×8), zera o super TB. */
function normalizePro8RowAfterGameChange(prev: SetItem, row: SetItem, gamesPerSet: number): SetItem {
  const g = gamesPerSet;
  const was88 = prev.a === g && prev.b === g;
  const now88 = row.a === g && row.b === g;
  if ((now88 && !was88) || !shouldShowPro8DecisiveTiebreak(row, g)) {
    return { ...row, tiebreakA: 0, tiebreakB: 0 };
  }
  return row;
}

function PlayerChip({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-fg">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
      </span>
      <span className="truncate text-xs font-semibold text-eid-fg">{name}</span>
    </div>
  );
}

export function SetScoreGrid({ config, sets, onChange, sideALabel, sideBLabel, sideAAvatarUrl, sideBAvatarUrl }: Props) {
  const isMelhorDe3SuperTb =
    config.type === "sets" && config.setsToWin === 2 && config.gamesPerSet === 6 && config.finalSetSuperTiebreak;
  const s1 = sets[0] ?? { a: 0, b: 0, tiebreakA: 0, tiebreakB: 0 };
  const s2 = sets[1] ?? { a: 0, b: 0, tiebreakA: 0, tiebreakB: 0 };
  const s3 = sets[2] ?? { a: 0, b: 0, tiebreakA: 0, tiebreakB: 0 };
  const s1Eval = evaluateSetForConfig(s1, { ...config, finalSetSuperTiebreak: false }, false);
  const s2Eval = evaluateSetForConfig(s2, { ...config, finalSetSuperTiebreak: false }, false);
  const precisaSuperTb = s1Eval.ok && s2Eval.ok && s1Eval.winner && s2Eval.winner && s1Eval.winner !== s2Eval.winner;
  const finalizadoEm2Sets = s1Eval.ok && s2Eval.ok && s1Eval.winner && s2Eval.winner && s1Eval.winner === s2Eval.winner;

  const cfgNoFinalTb = { ...config, finalSetSuperTiebreak: false };
  const isPro8 = isProSet8Format(config);
  const showGlobalTiebreakSection =
    !isMelhorDe3SuperTb &&
    config.tiebreak &&
    sets.some((set) => (isPro8 ? shouldShowPro8DecisiveTiebreak(set, config.gamesPerSet) : true));

  const setCardShellClass =
    "rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 px-2.5 py-2";
  const superTiebreakCardShellClass =
    "rounded-xl border border-[color:color-mix(in_srgb,var(--eid-warning-500)_52%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-warning-500)_26%,var(--eid-surface)_74%),color-mix(in_srgb,var(--eid-warning-500)_11%,var(--eid-card)_89%))] px-2.5 py-2 shadow-[0_0_22px_-6px_color-mix(in_srgb,var(--eid-warning-500)_38%,transparent),inset_0_1px_0_0_color-mix(in_srgb,var(--eid-warning-400)_32%,transparent)] ring-1 ring-[color:color-mix(in_srgb,var(--eid-warning-400)_22%,transparent)]";
  const tiebreakInnerPanelClass =
    "mt-2 rounded-lg border border-eid-primary-500/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_14%,transparent),color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)_95%))] px-2 py-1.5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)]";

  function renderSetCard(idx: number, title: string, set: SetItem, isSuperTb = false) {
    const setEvalNormal = !isSuperTb ? evaluateSetForConfig(set, cfgNoFinalTb, false) : { ok: false, winner: null as "a" | "b" | null };
    const showTb =
      isMelhorDe3SuperTb &&
      !isSuperTb &&
      config.tiebreak &&
      !setEvalNormal.ok &&
      ((set.a >= config.gamesPerSet && set.b >= config.gamesPerSet) || set.a + set.b >= config.gamesPerSet * 2);
    const maxA =
      isMelhorDe3SuperTb && !isSuperTb
        ? maxGamesMelhorDe3RegularSet(set, "a", config.gamesPerSet)
        : isPro8 && !isSuperTb
          ? maxGamesProSet8(set, "a", config.gamesPerSet)
          : undefined;
    const maxB =
      isMelhorDe3SuperTb && !isSuperTb
        ? maxGamesMelhorDe3RegularSet(set, "b", config.gamesPerSet)
        : isPro8 && !isSuperTb
          ? maxGamesProSet8(set, "b", config.gamesPerSet)
          : undefined;
    return (
      <div key={`set-${idx}`} className={isSuperTb ? superTiebreakCardShellClass : setCardShellClass}>
        {isSuperTb ? (
          <div className="flex items-center gap-1.5">
            <Trophy
              className="h-3.5 w-3.5 shrink-0 text-[color:var(--eid-warning-400)] drop-shadow-[0_0_6px_color-mix(in_srgb,var(--eid-warning-500)_45%,transparent)]"
              strokeWidth={2.25}
              aria-hidden
            />
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[color:color-mix(in_srgb,var(--eid-warning-400)_88%,var(--eid-fg)_12%)]">
              {title}
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">{title}</p>
        )}
        {!isSuperTb && setEvalNormal.ok && setEvalNormal.winner ? (
          <p className="mt-0.5 text-[11px] font-semibold text-eid-primary-700">
            Vencedor ({title}): {setEvalNormal.winner === "a" ? sideALabel : sideBLabel}
          </p>
        ) : null}
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <PlayerChip name={sideALabel} avatarUrl={sideAAvatarUrl} />
            <ScoreCounter
              value={set.a}
              compact
              max={maxA}
              onChange={(next) => {
                const draft = [...sets];
                let row: SetItem = { ...set, a: next };
                if (isPro8 && !isSuperTb) {
                  row = normalizePro8RowAfterGameChange(set, row, config.gamesPerSet);
                }
                draft[idx] = row;
                onChange(draft);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <PlayerChip name={sideBLabel} avatarUrl={sideBAvatarUrl} />
            <ScoreCounter
              value={set.b}
              compact
              max={maxB}
              onChange={(next) => {
                const draft = [...sets];
                let row: SetItem = { ...set, b: next };
                if (isPro8 && !isSuperTb) {
                  row = normalizePro8RowAfterGameChange(set, row, config.gamesPerSet);
                }
                draft[idx] = row;
                onChange(draft);
              }}
            />
          </div>
        </div>
        {isSuperTb ? (
          <p className="mt-1 text-[10px] font-medium text-[color:color-mix(in_srgb,var(--eid-warning-400)_72%,var(--eid-text-secondary)_28%)]">
            Super tiebreak até 10, com 2 pontos de diferença.
          </p>
        ) : null}
        {showTb ? (
          <div className={tiebreakInnerPanelClass}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-primary-300">Tiebreak do set</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <PlayerChip name={sideALabel} avatarUrl={sideAAvatarUrl} />
              <ScoreCounter
                value={set.tiebreakA ?? 0}
                compact
                onChange={(next) => {
                  const draft = [...sets];
                  draft[idx] = syncSetGamesFromTiebreak({ ...set, tiebreakA: next }, cfgNoFinalTb);
                  onChange(draft);
                }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <PlayerChip name={sideBLabel} avatarUrl={sideBAvatarUrl} />
              <ScoreCounter
                value={set.tiebreakB ?? 0}
                compact
                onChange={(next) => {
                  const draft = [...sets];
                  draft[idx] = syncSetGamesFromTiebreak({ ...set, tiebreakB: next }, cfgNoFinalTb);
                  onChange(draft);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">Sets</p>
      {isMelhorDe3SuperTb ? (
        <div className="mt-2 space-y-2">
          {renderSetCard(0, "Set 1", s1)}
          {s1Eval.ok ? renderSetCard(1, "Set 2", s2) : null}
          {precisaSuperTb ? renderSetCard(2, "Super tiebreak", s3, true) : null}
          {finalizadoEm2Sets ? (
            <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--eid-success-400)_78%,var(--eid-fg)_22%)]">
              Vitória definida em 2 sets. Não é necessário super tiebreak.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {sets.map((set, idx) => renderSetCard(idx, isPro8 ? "Pro set" : `Set ${idx + 1}`, set))}
        </div>
      )}
      {showGlobalTiebreakSection ? (
        <div className="mt-3 space-y-2">
          <p
            className={`text-[10px] font-black uppercase tracking-[0.12em] ${isPro8 ? "text-[color:color-mix(in_srgb,var(--eid-warning-400)_82%,var(--eid-fg)_18%)]" : "text-eid-primary-300"}`}
          >
            {isPro8 ? "Super tiebreak decisivo (7 pts)" : "Tiebreak"}
          </p>
          {sets.map((set, idx) => {
            if (isPro8 && !shouldShowPro8DecisiveTiebreak(set, config.gamesPerSet)) return null;
            return (
            <div
              key={`tb-${idx}`}
              className={
                isPro8
                  ? superTiebreakCardShellClass
                  : "rounded-xl border border-eid-primary-500/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)_88%),color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-card)_95%))] px-2 py-1.5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]"
              }
            >
              <div className="flex items-center gap-1.5">
                {isPro8 ? (
                  <Trophy
                    className="h-3 w-3 shrink-0 text-[color:var(--eid-warning-400)]"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : null}
                <p
                  className={`text-[11px] font-semibold ${isPro8 ? "text-[color:color-mix(in_srgb,var(--eid-warning-400)_88%,var(--eid-fg)_12%)]" : "text-eid-primary-300"}`}
                >
                  {isPro8 ? "Decisivo no 8×8" : `Set ${idx + 1}`}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <PlayerChip name={sideALabel} avatarUrl={sideAAvatarUrl} />
                  <ScoreCounter
                    value={set.tiebreakA ?? 0}
                    compact
                    onChange={(next) => {
                      const draft = [...sets];
                      draft[idx] = syncSetGamesFromTiebreak({ ...draft[idx], tiebreakA: next }, cfgNoFinalTb);
                      onChange(draft);
                    }}
                  />
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <PlayerChip name={sideBLabel} avatarUrl={sideBAvatarUrl} />
                  <ScoreCounter
                    value={set.tiebreakB ?? 0}
                    compact
                    onChange={(next) => {
                      const draft = [...sets];
                      draft[idx] = syncSetGamesFromTiebreak({ ...draft[idx], tiebreakB: next }, cfgNoFinalTb);
                      onChange(draft);
                    }}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
