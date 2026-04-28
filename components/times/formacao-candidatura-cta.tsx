"use client";

import { useState } from "react";
import { CandidatarNaVagaForm, CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";

/** Bloco de candidatura (vagas) — reutilizado no card de /times e na página pública da formação. */
export function FormacaoCandidaturaCta({
  timeId,
  vagasAbertas,
  aceitaPedidos,
  minhaCandidaturaPendenteId,
  jaSouMembro,
}: {
  timeId: number;
  vagasAbertas: boolean;
  aceitaPedidos: boolean;
  minhaCandidaturaPendenteId: number | null;
  jaSouMembro: boolean;
}) {
  const [showMsg, setShowMsg] = useState(false);
  const aceitaCand = Boolean(vagasAbertas && aceitaPedidos);

  if (jaSouMembro) {
    return <p className="text-center text-[10px] font-semibold text-eid-primary-300">Você já faz parte desta formação.</p>;
  }

  if (!aceitaCand) {
    return <p className="text-center text-[10px] text-eid-text-secondary">Esta formação não está aceitando candidaturas agora.</p>;
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
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowMsg((v) => !v)}
        className="w-full text-center text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary underline-offset-2 hover:text-eid-primary-300 hover:underline"
      >
        {showMsg ? "Ocultar mensagem opcional" : "Adicionar mensagem ao líder (opcional)"}
      </button>
      <CandidatarNaVagaForm timeId={timeId} hideMessageField={!showMsg} submitLabel="Candidatar" />
    </div>
  );
}
