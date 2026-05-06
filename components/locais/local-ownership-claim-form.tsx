"use client";

import { useActionState } from "react";
import { solicitarPropriedadeOficialLocal, type LocalActionState } from "@/app/locais/actions";
import { locaisFormPanelClass, locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";

const initialState: LocalActionState = { ok: false, message: "" };

const labelClass =
  "text-[10px] font-black uppercase tracking-[0.08em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)]";

export function LocalOwnershipClaimForm({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(solicitarPropriedadeOficialLocal, initialState);

  return (
    <form action={formAction} className={`${locaisFormPanelClass} mt-4`}>
      <input type="hidden" name="espaco_id" value={espacoId} />
      <p className={locaisSectionTitleClass}>Posse oficial</p>
      <h2 className="mt-1 text-base font-black tracking-tight text-eid-fg sm:text-lg">Solicitar validação</h2>
      <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:text-sm">
        Envie um documento comprobatório para o admin validar você como proprietário oficial deste espaço.
      </p>

      <div className="mt-4">
        <label htmlFor={`documento-${espacoId}`} className={labelClass}>
          Documento comprobatório
        </label>
        <input
          id={`documento-${espacoId}`}
          name="documento"
          type="file"
          required
          className="mt-1.5 block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-xl file:border file:border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,transparent)] file:bg-eid-primary-500/12 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-eid-primary-300"
        />
      </div>

      <div className="mt-3">
        <label htmlFor={`mensagem-${espacoId}`} className={labelClass}>
          Mensagem opcional
        </label>
        <textarea
          id={`mensagem-${espacoId}`}
          name="mensagem"
          rows={3}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 !text-[15px] !leading-snug text-eid-fg placeholder:text-eid-text-secondary"
          placeholder="Explique o vínculo com o espaço, se necessário."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary mt-4 min-h-[42px] w-full rounded-xl px-4 text-[11px] font-black uppercase tracking-wide transition disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
      >
        {pending ? "Enviando..." : "Enviar para validação"}
      </button>

      {state.message ? (
        <p className={`mt-3 text-sm leading-snug ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
