"use client";

import { useActionState } from "react";
import {
  gerarCobrancaMensalidadePlataformaEspacoAction,
  solicitarCancelamentoAssinaturaPlataformaEspacoAction,
} from "@/app/espaco/actions";

export function EspacoMensalidadePaasCheckout({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(gerarCobrancaMensalidadePlataformaEspacoAction, null);
  return (
    <div className="mt-3 space-y-3">
      <form action={formAction}>
        <input type="hidden" name="espaco_id" value={espacoId} />
        <button
          type="submit"
          disabled={pending}
          className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold sm:w-auto"
        >
          {pending ? "Ativando recorrência..." : "Ativar mês grátis + recorrência no cartão"}
        </button>
      </form>
      <form action={solicitarCancelamentoAssinaturaPlataformaEspacoAction}>
        <input type="hidden" name="espaco_id" value={espacoId} />
        <button
          type="submit"
          className="w-full rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 sm:w-auto"
        >
          Solicitar cancelamento (após 3 meses)
        </button>
      </form>
      {state != null && state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
      <p className="text-[11px] text-eid-text-secondary">
        A mensalidade PaaS agora aceita somente cartão de crédito, com primeiro mês gratuito e recorrência automática no mês seguinte.
      </p>
    </div>
  );
}
