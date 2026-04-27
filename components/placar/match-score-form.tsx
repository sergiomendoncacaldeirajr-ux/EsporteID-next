"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitPlacarAction } from "@/app/registrar-placar/[id]/actions";
import { type MatchScorePayload, type MatchUIConfig, type SetFormatOption, validateMatchScorePayload } from "@/lib/match-scoring";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { GoalsScore } from "./goals-score";
import { PointsScore } from "./points-score";
import { RoundsScore } from "./rounds-score";
import { SetScoreGrid } from "./set-score-grid";

type Props = {
  partidaId: number;
  config: MatchUIConfig;
  setFormatOptions?: SetFormatOption[];
  initialSetFormatKey?: string | null;
  sideALabel: string;
  sideBLabel: string;
  sideAAvatarUrl?: string | null;
  sideBAvatarUrl?: string | null;
  isTorneio: boolean;
};

function SubmitPlacarButton({ disabled, isTorneio }: { disabled: boolean; isTorneio: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <DesafioFlowCtaIcon />
      <span>
        {pending ? "Lançando..." : isTorneio ? "Salvar e validar resultado" : "Enviar resultado para confirmação"}
      </span>
    </button>
  );
}

function winnerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function buildInitialPayload(config: MatchUIConfig): MatchScorePayload {
  if (config.type === "gols") return { type: "gols", goals: { a: 0, b: 0, overtimeA: 0, overtimeB: 0, penaltiesA: 0, penaltiesB: 0 } };
  if (config.type === "pontos") return { type: "pontos", points: { a: 0, b: 0 } };
  if (config.type === "rounds") {
    return {
      type: "rounds",
      rounds: { method: "decision", winner: "a", items: Array.from({ length: config.maxRounds }, () => ({ a: 10, b: 9 })) },
    };
  }
  return {
    type: "sets",
    sets: Array.from({ length: config.sets }, () => ({ a: 0, b: 0, tiebreakA: 0, tiebreakB: 0 })),
  };
}

export function MatchScoreForm({
  partidaId,
  config,
  setFormatOptions = [],
  initialSetFormatKey = null,
  sideALabel,
  sideBLabel,
  sideAAvatarUrl,
  sideBAvatarUrl,
  isTorneio,
}: Props) {
  const initialSelectedSetFormatKey = config.type === "sets" ? (initialSetFormatKey ?? null) : null;
  const initialSelectedSetFormatConfig =
    config.type === "sets" ? setFormatOptions.find((opt) => opt.key === initialSelectedSetFormatKey)?.config ?? config : null;
  const [selectedSetFormatKey, setSelectedSetFormatKey] = useState<string | null>(initialSelectedSetFormatKey);
  const [payload, setPayload] = useState<MatchScorePayload>(() => buildInitialPayload(initialSelectedSetFormatConfig ?? config));
  const selectedSetFormatConfig = useMemo(() => {
    if (config.type !== "sets") return null;
    const found = setFormatOptions.find((opt) => opt.key === selectedSetFormatKey);
    return found?.config ?? null;
  }, [config.type, setFormatOptions, selectedSetFormatKey]);
  const activeConfig = selectedSetFormatConfig ?? config;

  const validation = useMemo(() => validateMatchScorePayload(activeConfig, payload), [activeConfig, payload]);
  const requiredSetFormatMissing = config.type === "sets" && setFormatOptions.length > 0 && !selectedSetFormatKey;
  const disabled = !validation.valid || requiredSetFormatMissing;

  const matchWinner =
    validation.valid &&
    !requiredSetFormatMissing &&
    validation.placar1 != null &&
    validation.placar2 != null &&
    validation.placar1 !== validation.placar2
      ? validation.placar1 > validation.placar2
        ? { label: sideALabel, avatarUrl: sideAAvatarUrl }
        : { label: sideBLabel, avatarUrl: sideBAvatarUrl }
      : null;

  return (
    <form action={submitPlacarAction} className="mt-5 space-y-3">
      <input type="hidden" name="partida_id" value={partidaId} />
      <input type="hidden" name="placar_1" value={validation.placar1 ?? 0} />
      <input type="hidden" name="placar_2" value={validation.placar2 ?? 0} />
      {config.type === "sets" && selectedSetFormatKey ? <input type="hidden" name="score_format_key" value={selectedSetFormatKey} /> : null}
      <input type="hidden" name="score_payload" value={JSON.stringify(payload)} />

      {config.type === "sets" ? (
        <>
          {setFormatOptions.length > 0 ? (
            <div className="grid gap-1.5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Formato disputado</span>
              <div className="grid gap-2">
                {setFormatOptions.map((opt) => {
                  const selected = selectedSetFormatKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedSetFormatKey(opt.key);
                        setPayload(buildInitialPayload(opt.config));
                      }}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-200 shadow-[0_0_0_1px_color-mix(in_srgb,var(--eid-action-500)_40%,transparent)]"
                          : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 text-eid-fg hover:border-eid-primary-400/45 hover:bg-eid-surface/70"
                      }`}
                    >
                      <span className="block text-sm font-bold leading-tight">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        {selectedSetFormatKey ? (
          <SetScoreGrid
            config={activeConfig}
            sets={payload.sets ?? []}
            onChange={(sets) => setPayload({ type: "sets", sets })}
            sideALabel={sideALabel}
            sideBLabel={sideBLabel}
            sideAAvatarUrl={sideAAvatarUrl}
            sideBAvatarUrl={sideBAvatarUrl}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-3 py-2 text-[11px] text-eid-text-secondary">
            Escolha o formato disputado para liberar o lançamento dos sets.
          </div>
        )}
        </>
      ) : null}
      {config.type === "gols" ? (
        <GoalsScore
          score={payload.goals ?? { a: 0, b: 0 }}
          onChange={(goals) => setPayload({ type: "gols", goals })}
          sideALabel={sideALabel}
          sideBLabel={sideBLabel}
          hasOvertime={config.hasOvertime}
          hasPenalties={config.hasPenalties}
        />
      ) : null}
      {config.type === "pontos" ? (
        <PointsScore
          score={payload.points ?? { a: 0, b: 0 }}
          onChange={(points) => setPayload({ type: "pontos", points })}
          sideALabel={sideALabel}
          sideBLabel={sideBLabel}
          pointsLimit={config.pointsLimit}
        />
      ) : null}
      {config.type === "rounds" ? (
        <RoundsScore
          payload={
            payload.rounds ?? { method: "decision", winner: "a", items: Array.from({ length: config.maxRounds }, () => ({ a: 10, b: 9 })) }
          }
          onChange={(rounds) => setPayload({ type: "rounds", rounds })}
          sideALabel={sideALabel}
          sideBLabel={sideBLabel}
          maxRounds={config.maxRounds}
        />
      ) : null}

      {matchWinner ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-action-500)_55%,var(--eid-border-subtle)_45%)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_18%,var(--eid-card)_82%),color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)_88%))] p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--eid-action-500)_25%,transparent),0_16px_40px_-20px_color-mix(in_srgb,var(--eid-action-500)_45%,transparent)]"
          role="status"
          aria-live="polite"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-eid-action-500/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-eid-primary-500/15 blur-2xl"
            aria-hidden
          />
          <p className="relative text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">Vencedor da partida</p>
          <div className="relative mt-3 flex items-center gap-3">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-eid-action-400/80 bg-eid-surface text-sm font-black text-eid-fg shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--eid-action-500)_70%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--eid-action-500)_35%,transparent)] ring-offset-2 ring-offset-[color-mix(in_srgb,var(--eid-card)_92%,transparent)]">
              {matchWinner.avatarUrl ? (
                <img src={matchWinner.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                winnerInitials(matchWinner.label)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black tracking-tight text-eid-fg md:text-lg">{matchWinner.label}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-eid-primary-300">Parabéns pela vitória neste confronto</p>
            </div>
          </div>
        </div>
      ) : null}

      <SubmitPlacarButton disabled={disabled} isTorneio={isTorneio} />
    </form>
  );
}
