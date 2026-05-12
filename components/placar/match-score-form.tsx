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
  /** Escudo de time/dupla (bordas menos circulares que avatar de perfil). */
  sideAAvatarEhFormacao?: boolean;
  sideBAvatarEhFormacao?: boolean;
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
  sideAAvatarEhFormacao = false,
  sideBAvatarEhFormacao = false,
  isTorneio,
}: Props) {
  const initialSelectedSetFormatKey = config.type === "sets" ? (initialSetFormatKey ?? null) : null;
  const initialSelectedSetFormatConfig =
    config.type === "sets" ? setFormatOptions.find((opt) => opt.key === initialSelectedSetFormatKey)?.config ?? config : null;
  const [selectedSetFormatKey, setSelectedSetFormatKey] = useState<string | null>(initialSelectedSetFormatKey);
  const [payload, setPayload] = useState<MatchScorePayload>(() => buildInitialPayload(initialSelectedSetFormatConfig ?? config));
  const [resultMode, setResultMode] = useState<"placar" | "wo">("placar");
  const [woDesistente, setWoDesistente] = useState<"a" | "b">("b");
  const selectedSetFormatConfig = useMemo(() => {
    if (config.type !== "sets") return null;
    const found = setFormatOptions.find((opt) => opt.key === selectedSetFormatKey);
    return found?.config ?? null;
  }, [config.type, setFormatOptions, selectedSetFormatKey]);
  const activeConfig = selectedSetFormatConfig ?? config;

  const validation = useMemo(() => validateMatchScorePayload(activeConfig, payload), [activeConfig, payload]);
  const requiredSetFormatMissing = config.type === "sets" && setFormatOptions.length > 0 && !selectedSetFormatKey;
  const isWo = resultMode === "wo";
  const disabled = isWo ? false : !validation.valid || requiredSetFormatMissing;

  const matchWinner =
    validation.valid &&
    !requiredSetFormatMissing &&
    validation.placar1 != null &&
    validation.placar2 != null &&
    validation.placar1 !== validation.placar2
      ? validation.placar1 > validation.placar2
        ? { label: sideALabel, avatarUrl: sideAAvatarUrl, avatarEhFormacao: sideAAvatarEhFormacao }
        : { label: sideBLabel, avatarUrl: sideBAvatarUrl, avatarEhFormacao: sideBAvatarEhFormacao }
      : null;

  return (
    <form action={submitPlacarAction} className="mt-5 space-y-3">
      <input type="hidden" name="partida_id" value={partidaId} />
      <input type="hidden" name="placar_1" value={validation.placar1 ?? 0} />
      <input type="hidden" name="placar_2" value={validation.placar2 ?? 0} />
      {isWo ? (
        <>
          <input type="hidden" name="wo_ativo" value="1" />
          <input type="hidden" name="wo_vencedor" value={woDesistente === "a" ? "j2" : "j1"} />
          <input type="hidden" name="wo_desistente" value={woDesistente === "a" ? "j1" : "j2"} />
        </>
      ) : null}
      {config.type === "sets" && selectedSetFormatKey ? <input type="hidden" name="score_format_key" value={selectedSetFormatKey} /> : null}
      <input type="hidden" name="score_payload" value={JSON.stringify(payload)} />

      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setResultMode("placar")}
            className={`min-h-[30px] rounded-lg border px-2 text-[9px] font-black uppercase tracking-[0.06em] transition ${
              !isWo
                ? "border-eid-action-500/45 bg-eid-action-500/15 text-eid-action-200"
                : "border-[color:var(--eid-border-subtle)] bg-eid-card/50 text-eid-text-secondary hover:bg-eid-card"
            }`}
          >
            Placar
          </button>
          <button
            type="button"
            onClick={() => setResultMode("wo")}
            className={`min-h-[30px] rounded-lg border px-2 text-[9px] font-black uppercase tracking-[0.06em] transition ${
              isWo
                ? "border-amber-500/45 bg-amber-500/14 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,#f59e0b_42%)]"
                : "border-[color:var(--eid-border-subtle)] bg-eid-card/50 text-eid-text-secondary hover:bg-eid-card"
            }`}
          >
            W.O.
          </button>
        </div>

        {isWo ? (
          <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/8 p-2">
            <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)]">
              Quem desistiu?
            </p>
            <div className="mt-2 grid gap-1.5">
              {[
                { key: "a" as const, label: sideALabel, winner: sideBLabel },
                { key: "b" as const, label: sideBLabel, winner: sideALabel },
              ].map((option) => {
                const selected = woDesistente === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setWoDesistente(option.key)}
                    className={`rounded-lg border px-2.5 py-2 text-left transition ${
                      selected
                        ? "border-amber-500/45 bg-amber-500/14"
                        : "border-[color:var(--eid-border-subtle)] bg-eid-card/50 hover:bg-eid-card"
                    }`}
                  >
                    <span className="block truncate text-[11px] font-black text-eid-fg">{option.label}</span>
                    <span className="mt-0.5 block truncate text-[9px] font-semibold text-eid-text-secondary">
                      Vitória para {option.winner}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {!isWo && config.type === "sets" ? (
        <>
          {setFormatOptions.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),var(--eid-card))]">
              <div className="flex items-center justify-between gap-2 border-b border-[rgba(37,99,235,0.12)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-primary-500)_9%,var(--eid-surface)),color-mix(in_srgb,var(--eid-primary-500)_4%,var(--eid-surface)))] px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-primary-200">Formato disputado</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-300 shadow-[0_0_8px_-3px_rgba(37,99,235,0.25)]">
                  Regras
                </span>
              </div>
              <div className="grid gap-2 p-2.5">
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
      {!isWo && config.type === "gols" ? (
        <GoalsScore
          score={{
            a: payload.goals?.a ?? 0,
            b: payload.goals?.b ?? 0,
            overtimeA: payload.goals?.overtimeA ?? 0,
            overtimeB: payload.goals?.overtimeB ?? 0,
            penaltiesA: payload.goals?.penaltiesA ?? 0,
            penaltiesB: payload.goals?.penaltiesB ?? 0,
          }}
          onChange={(goals) => setPayload({ type: "gols", goals })}
          sideALabel={sideALabel}
          sideBLabel={sideBLabel}
          sideAAvatarUrl={sideAAvatarUrl}
          sideBAvatarUrl={sideBAvatarUrl}
          sideAAvatarEhFormacao={sideAAvatarEhFormacao}
          sideBAvatarEhFormacao={sideBAvatarEhFormacao}
          hasOvertime={config.hasOvertime}
          hasPenalties={config.hasPenalties}
        />
      ) : null}
      {!isWo && config.type === "pontos" ? (
        <PointsScore
          score={payload.points ?? { a: 0, b: 0 }}
          onChange={(points) => setPayload({ type: "pontos", points })}
          sideALabel={sideALabel}
          sideBLabel={sideBLabel}
          pointsLimit={config.pointsLimit}
        />
      ) : null}
      {!isWo && config.type === "rounds" ? (
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

      {isWo ? (
        <div
          className="rounded-xl border border-amber-500/28 bg-[linear-gradient(135deg,color-mix(in_srgb,#f59e0b_11%,var(--eid-card)),var(--eid-card))] px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)]">
            Resultado por W.O.
          </p>
          <p className="mt-1 text-[11px] font-semibold text-eid-fg">
            {woDesistente === "a" ? sideBLabel : sideALabel} vence por desistência de{" "}
            {woDesistente === "a" ? sideALabel : sideBLabel}.
          </p>
        </div>
      ) : matchWinner ? (
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
            <span
              className={`relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-eid-action-400/80 bg-eid-surface text-sm font-black text-eid-fg shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--eid-action-500)_70%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--eid-action-500)_35%,transparent)] ring-offset-2 ring-offset-[color-mix(in_srgb,var(--eid-card)_92%,transparent)] ${
                matchWinner.avatarEhFormacao ? "rounded-2xl" : "rounded-full"
              }`}
            >
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
