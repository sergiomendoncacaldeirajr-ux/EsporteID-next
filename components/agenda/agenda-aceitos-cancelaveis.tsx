"use client";

import { useActionState } from "react";
import { cancelarMatchAceito, type CancelarMatchState } from "@/app/comunidade/actions";

type Item = {
  id: number;
  nomeOponente: string;
  esporte: string;
  modalidade: string;
};

const initial: CancelarMatchState = { ok: false, message: "" };

export function AgendaAceitosCancelaveis({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState(cancelarMatchAceito, initial);
  const err = !state.ok && state.message ? state.message : null;
  const okMsg = state.ok ? "Desafio cancelado." : null;

  if (items.length === 0) return null;

  return (
    <section className="mt-6 md:mt-10">
      <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Desafios aceitos</h2>
      <p className="mt-1 text-xs text-eid-text-secondary">Sem acordo de data? Você pode cancelar e solicitar novamente depois.</p>
      <div className="mt-3 space-y-2">
        {okMsg ? (
          <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
        ) : null}
        {err ? (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>
        ) : null}
        {items.map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-eid-fg">{m.nomeOponente}</p>
              <p className="text-xs text-eid-text-secondary">
                {m.esporte} · {m.modalidade}
              </p>
            </div>
            <form action={formAction}>
              <input type="hidden" name="match_id" value={String(m.id)} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {pending ? "Cancelando..." : "Cancelar desafio"}
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
