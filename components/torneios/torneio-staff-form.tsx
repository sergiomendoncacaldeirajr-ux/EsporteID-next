"use client";

import { useActionState } from "react";
import { convidarTorneioStaff, type TorneioStaffActionState } from "@/app/torneios/actions";

const initialState: TorneioStaffActionState = { ok: false, message: "" };

export function TorneioStaffForm({ torneioId }: { torneioId: number }) {
  const [state, formAction, pending] = useActionState(convidarTorneioStaff, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
      <input type="hidden" name="torneio_id" value={torneioId} />
      <h3 className="text-sm font-bold text-eid-fg">Convidar lançador de placar</h3>
      <p className="mt-1 text-xs text-eid-text-secondary">
        Convide por e-mail. Se a conta já existir, o acesso entra ativo imediatamente.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          name="convite_email"
          type="email"
          required
          placeholder="email@exemplo.com"
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="observacoes"
          placeholder="Observações internas (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] disabled:opacity-60"
      >
        {pending ? "Convidando..." : "Adicionar staff"}
      </button>
      {state.message ? (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
