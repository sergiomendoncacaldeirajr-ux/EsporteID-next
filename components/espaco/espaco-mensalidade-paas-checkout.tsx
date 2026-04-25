"use client";

import { useActionState } from "react";
import { gerarCobrancaMensalidadePlataformaEspacoAction } from "@/app/espaco/actions";

export function EspacoMensalidadePaasCheckout({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(gerarCobrancaMensalidadePlataformaEspacoAction, null);
  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold sm:w-auto"
      >
        {pending ? "Gerando PIX…" : "Pagar mensalidade (checkout rápido)"}
      </button>
      {state != null && !state.ok && state.message ? (
        <p className="mt-2 text-xs text-red-300">{state.message}</p>
      ) : null}
      <p className="mt-2 text-[11px] text-eid-text-secondary">
        Abre a fatura/PIX do Asaas em outra tela. Após o pagamento, a próxima cobrança no painel é atualizada via webhook.
      </p>
    </form>
  );
}
