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
import {
  DESAFIO_FLOW_CTA_BLOCK_CLASS,
  PEDIDO_ACEITAR_BTN_CLASS,
  PEDIDO_CANCELAR_COMPACT_BTN_CLASS,
  PEDIDO_RECUSAR_BTN_CLASS,
} from "@/lib/desafio/flow-ui";

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
            ? PEDIDO_CANCELAR_COMPACT_BTN_CLASS
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
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <input type="hidden" name="aceitar" value={aceitar ? "true" : "false"} />
      <button
        type="submit"
        disabled={pending}
        className={aceitar ? PEDIDO_ACEITAR_BTN_CLASS : PEDIDO_RECUSAR_BTN_CLASS}
      >
        {pending ? "Salvando..." : label}
      </button>
      {state.message ? (
        <p className={`text-[11px] ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
