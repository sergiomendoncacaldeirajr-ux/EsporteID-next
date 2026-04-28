"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import {
  candidatarEmVagaAction,
  cancelarCandidaturaAction,
  responderCandidaturaAction,
  type VagaActionState,
} from "@/app/vagas/actions";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";

const initialState: VagaActionState = { ok: false, message: "" };

export function CandidatarNaVagaForm({
  timeId,
  hideMessageField = false,
  submitLabel = "Candidatar-se ao elenco",
}: {
  timeId: number;
  hideMessageField?: boolean;
  /** Texto do botão (ex.: "Candidatar" nos cards). */
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(candidatarEmVagaAction, initialState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="time_id" value={timeId} />
      {hideMessageField ? <input type="hidden" name="mensagem" value="" /> : null}
      {!hideMessageField ? (
        <textarea
          name="mensagem"
          rows={2}
          placeholder="Mensagem opcional para o líder"
          className="eid-input-dark w-full rounded-xl px-3 py-2 text-xs text-eid-fg"
        />
      ) : null}
      <button type="submit" disabled={pending} className={DESAFIO_FLOW_CTA_BLOCK_CLASS}>
        <DesafioFlowCtaIcon />
        <span>{pending ? "Enviando…" : submitLabel}</span>
      </button>
      {state.message ? (
        <p className={`text-[11px] ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

export function CancelarCandidaturaForm({
  candidaturaId,
  compact = false,
  label = "Cancelar candidatura",
}: {
  candidaturaId: number;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(cancelarCandidaturaAction, initialState);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "inline-flex min-h-[28px] items-center justify-center rounded-lg border border-red-700/90 bg-red-700 px-2.5 text-[10px] font-black uppercase tracking-[0.04em] text-white shadow-[0_8px_16px_-12px_rgba(220,38,38,0.8)] transition hover:bg-red-800 disabled:opacity-60"
            : "w-full rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
        }
      >
        {pending ? "Cancelando..." : label}
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
  const router = useRouter();
  const [state, action, pending] = useActionState(responderCandidaturaAction, initialState);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <input type="hidden" name="aceitar" value={aceitar ? "true" : "false"} />
      <button
        type="submit"
        disabled={pending}
        className={
          aceitar
            ? "inline-flex min-h-[34px] min-w-[96px] items-center justify-center rounded-lg border border-eid-primary-500 bg-eid-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-eid-primary-600 disabled:opacity-60"
            : "inline-flex min-h-[34px] min-w-[96px] items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:bg-eid-surface/50 disabled:opacity-60"
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
