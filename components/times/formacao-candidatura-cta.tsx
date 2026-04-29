"use client";

import { CandidatarNaVagaForm, CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";

/** Bloco de candidatura (vagas) — reutilizado no card de /times e na página pública da formação. */
export function FormacaoCandidaturaCta({
  timeId,
  vagasAbertas,
  aceitaPedidos,
  vagasDisponiveis,
  minhaCandidaturaPendenteId,
  jaSouMembro,
  submitLabel,
}: {
  timeId: number;
  vagasAbertas: boolean;
  aceitaPedidos: boolean;
  vagasDisponiveis?: number | null;
  minhaCandidaturaPendenteId: number | null;
  jaSouMembro: boolean;
  submitLabel?: string;
}) {
  const temVagaReal = vagasDisponiveis == null ? true : Number(vagasDisponiveis) > 0;
  const aceitaCand = Boolean(vagasAbertas && aceitaPedidos && temVagaReal);

  if (jaSouMembro) {
    return <p className="text-center text-[10px] font-semibold text-eid-primary-300">Você já faz parte desta formação.</p>;
  }

  if (!aceitaCand) {
    return (
      <p className="text-center text-[10px] text-eid-text-secondary">
        {temVagaReal
          ? "Esta formação não está aceitando candidaturas agora."
          : "Formação completa no momento. Candidaturas reabrem quando surgir vaga."}
      </p>
    );
  }

  if (minhaCandidaturaPendenteId != null) {
    return (
      <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_70%,var(--eid-action-500)_30%)] bg-[color:color-mix(in_srgb,var(--eid-card)_94%,var(--eid-action-500)_6%)] px-3 py-2">
        <p className="text-[11px] font-semibold text-eid-fg">Candidatura enviada — aguardando o líder.</p>
        <div className="mt-2">
          <CancelarCandidaturaForm candidaturaId={minhaCandidaturaPendenteId} />
        </div>
      </div>
    );
  }

  return (
    <CandidatarNaVagaForm timeId={timeId} hideMessageField submitLabel={submitLabel ?? "Candidatar"} />
  );
}
