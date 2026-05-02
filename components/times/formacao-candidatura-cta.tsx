"use client";

import { CandidatarNaVagaForm, CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";
import { AVISO_REGRA_LIMITE_FORMACAO_GLOBAL } from "@/lib/formacao/formacao-global-limit";

/** Bloco de candidatura (vagas) — reutilizado no card de /times e na página pública da formação. */
export function FormacaoCandidaturaCta({
  timeId,
  vagasAbertas,
  aceitaPedidos,
  vagasDisponiveis,
  minhaCandidaturaPendenteId,
  jaSouMembro,
  submitLabel,
  textAlign = "center",
}: {
  timeId: number;
  vagasAbertas: boolean;
  aceitaPedidos: boolean;
  vagasDisponiveis?: number | null;
  minhaCandidaturaPendenteId: number | null;
  jaSouMembro: boolean;
  submitLabel?: string;
  /** Alinhamento do texto informativo (callout do perfil usa `start`). */
  textAlign?: "center" | "start";
}) {
  const temVagaReal = vagasDisponiveis == null ? true : Number(vagasDisponiveis) > 0;
  const aceitaCand = Boolean(vagasAbertas && aceitaPedidos && temVagaReal);
  const pAlign = textAlign === "start" ? "text-left" : "text-center";

  if (jaSouMembro) {
    return (
      <p className={`${pAlign} text-[11px] font-semibold leading-snug text-eid-primary-300`}>
        Você já faz parte desta formação.
      </p>
    );
  }

  if (!aceitaCand) {
    return (
      <p className={`${pAlign} text-[11px] leading-relaxed text-[color:color-mix(in_srgb,var(--eid-text-secondary)_92%,var(--eid-primary-400)_8%)]`}>
        {temVagaReal
          ? "No momento o líder não está aceitando novas candidaturas. Volte mais tarde ou entre em contato com o time."
          : "Formação completa no momento. Candidaturas reabrem quando surgir vaga."}
      </p>
    );
  }

  if (minhaCandidaturaPendenteId != null) {
    return (
      <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,var(--eid-action-500)_28%)] bg-[color:color-mix(in_srgb,var(--eid-card)_96%,var(--eid-action-500)_4%)] px-2.5 py-2">
        <p className={`text-[10px] font-semibold leading-snug text-eid-fg ${pAlign}`}>
          Candidatura enviada — aguardando o líder.
        </p>
        <div className="mt-1.5">
          <CancelarCandidaturaForm candidaturaId={minhaCandidaturaPendenteId} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className={`rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_85%,var(--eid-primary-500)_15%)] bg-[color:color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%)] px-2.5 py-2 text-[10px] font-medium leading-snug text-eid-text-secondary ${pAlign}`}>
        {AVISO_REGRA_LIMITE_FORMACAO_GLOBAL}
      </p>
      <CandidatarNaVagaForm timeId={timeId} hideMessageField submitLabel={submitLabel ?? "Candidatar"} />
    </div>
  );
}
