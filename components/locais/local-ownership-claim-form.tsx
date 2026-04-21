"use client";

import { useActionState } from "react";
import { solicitarPropriedadeOficialLocal, type LocalActionState } from "@/app/locais/actions";

const initialState: LocalActionState = { ok: false, message: "" };

export function LocalOwnershipClaimForm({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(solicitarPropriedadeOficialLocal, initialState);

  return (
    <form action={formAction} className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <h2 className="text-sm font-bold text-eid-fg">Solicitar posse oficial</h2>
      <p className="mt-1 text-xs text-eid-text-secondary">
        Envie um documento comprobatório para o admin validar você como proprietário oficial deste espaço.
      </p>

      <div className="mt-3">
        <label htmlFor={`documento-${espacoId}`} className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Documento comprobatório
        </label>
        <input
          id={`documento-${espacoId}`}
          name="documento"
          type="file"
          required
          className="mt-1.5 block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-eid-primary-500/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-eid-primary-300"
        />
      </div>

      <div className="mt-3">
        <label htmlFor={`mensagem-${espacoId}`} className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Mensagem opcional
        </label>
        <textarea
          id={`mensagem-${espacoId}`}
          name="mensagem"
          rows={3}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
          placeholder="Explique o vínculo com o espaço, se necessário."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar para validação"}
      </button>

      {state.message ? (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
