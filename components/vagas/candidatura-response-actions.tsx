"use client";

import { ResponderCandidaturaForm } from "@/components/vagas/vagas-actions";
import { PEDIDO_MATCH_RECEBIDO_FORM_CLASS, PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS } from "@/lib/desafio/flow-ui";

type Props = {
  candidaturaId: number;
  className?: string;
};

/** Ações padrão de responder candidatura (aprovar/recusar). */
export function CandidaturaResponseActions({ candidaturaId, className }: Props) {
  return (
    <div className={`${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} ${className ?? ""}`.trim()}>
      <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
        <ResponderCandidaturaForm candidaturaId={candidaturaId} aceitar={true} stretch lightChrome label="Aprovar" />
      </div>
      <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
        <ResponderCandidaturaForm candidaturaId={candidaturaId} aceitar={false} stretch lightChrome label="Recusar" />
      </div>
    </div>
  );
}
