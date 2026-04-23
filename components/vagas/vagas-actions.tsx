"use client";

import { useActionState } from "react";
import {
  candidatarEmVagaAction,
  cancelarCandidaturaAction,
  responderCandidaturaAction,
  type VagaActionState,
} from "@/app/vagas/actions";

const initialState: VagaActionState = { ok: false, message: "" };

export function CandidatarNaVagaForm({ timeId }: { timeId: number }) {
  const [state, action, pending] = useActionState(candidatarEmVagaAction, initialState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="time_id" value={timeId} />
      <textarea
        name="mensagem"
        rows={2}
        placeholder="Mensagem opcional para o líder"
        className="eid-input-dark w-full rounded-xl px-3 py-2 text-xs text-eid-fg"
      />
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-3 py-2 text-xs font-bold"
      >
        {pending ? "Enviando..." : "Candidatar-se"}
      </button>
      {state.message ? (
        <p className={`text-[11px] ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

export function CancelarCandidaturaForm({ candidaturaId }: { candidaturaId: number }) {
  const [state, action, pending] = useActionState(cancelarCandidaturaAction, initialState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
      >
        {pending ? "Cancelando..." : "Cancelar candidatura"}
      </button>
      {state.message ? (
        <p className={`text-[11px] ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

export function ResponderCandidaturaForm({
  candidaturaId,
  aceitar,
  label,
}: {
  candidaturaId: number;
  aceitar: boolean;
  label: string;
}) {
  const [state, action, pending] = useActionState(responderCandidaturaAction, initialState);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <input type="hidden" name="aceitar" value={aceitar ? "true" : "false"} />
      <button
        type="submit"
        disabled={pending}
        className={
          aceitar
            ? "eid-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
            : "rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg"
        }
      >
        {pending ? "Salvando..." : label}
      </button>
      {state.message ? (
        <p className={`text-[11px] ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
