"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import {
  candidatarEmVagaAction,
  cancelarCandidaturaAction,
  responderCandidaturaAction,
  type VagaActionState,
} from "@/app/vagas/actions";
import {
  DESAFIO_FLOW_CTA_BLOCK_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACEITAR_BTN_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_RECUSAR_BTN_CLASS,
} from "@/lib/desafio/flow-ui";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";

const initialState: VagaActionState = { ok: false, message: "" };

export function CandidatarNaVagaForm({
  timeId,
  hideMessageField = false,
  submitLabel = "Candidatar-se ao elenco",
  onSuccess,
  refreshOnSuccess = true,
}: {
  timeId: number;
  hideMessageField?: boolean;
  /** Texto do botão (ex.: "Candidatar" nos cards). */
  submitLabel?: string;
  onSuccess?: () => void;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(candidatarEmVagaAction, initialState);
  useEffect(() => {
    if (!state.ok) return;
    onSuccess?.();
    if (refreshOnSuccess) router.refresh();
  }, [state.ok, onSuccess, refreshOnSuccess, router]);

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
  onSuccess,
  refreshOnSuccess = true,
}: {
  candidaturaId: number;
  compact?: boolean;
  label?: string;
  onSuccess?: () => void;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(cancelarCandidaturaAction, initialState);
  useEffect(() => {
    if (!state.ok) return;
    onSuccess?.();
    if (refreshOnSuccess) router.refresh();
  }, [state.ok, onSuccess, refreshOnSuccess, router]);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <EidCancelButton
        type="submit"
        loading={pending}
        label={label}
        compact={compact}
        className={
          compact
            ? "!min-h-[21px] !w-full justify-center overflow-hidden rounded-lg !px-2 text-[9px] focus-visible:ring-0 focus-visible:ring-offset-0"
            : "w-full justify-center overflow-hidden rounded-xl !text-xs"
        }
      />
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
  /** Dois botões lado a lado ocupando a faixa (ex.: card na Comunidade). */
  stretch = true,
  /** Mantido por compatibilidade; mensagens de sucesso/erro usam tom claro quando `stretch`. */
  lightChrome = false,
}: {
  candidaturaId: number;
  aceitar: boolean;
  label: string;
  stretch?: boolean;
  lightChrome?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(responderCandidaturaAction, initialState);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  const lightMsg = stretch || lightChrome;
  const btnClass = aceitar
    ? PEDIDO_MATCH_RECEBIDO_SOCIAL_ACEITAR_BTN_CLASS
    : PEDIDO_MATCH_RECEBIDO_SOCIAL_RECUSAR_BTN_CLASS;
  const formClass = stretch
    ? "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1"
    : "inline-flex flex-col items-start gap-1";
  return (
    <form action={action} className={formClass}>
      <input type="hidden" name="candidatura_id" value={candidaturaId} />
      <input type="hidden" name="aceitar" value={aceitar ? "true" : "false"} />
      {stretch ? (
        aceitar ? (
          <EidSocialAceitarButton
            pending={pending}
            busy={pending}
            actionLabel="aprovar"
            className={`${btnClass} w-full shrink-0`}
          />
        ) : (
          <EidSocialRecusarButton pending={pending} busy={pending} className={`${btnClass} w-full shrink-0`} />
        )
      ) : (
        <button type="submit" disabled={pending} className={`${btnClass} w-full shrink-0 uppercase`}>
          <span className={pending ? "eid-social-action-loading-text" : ""}>
            {pending ? (aceitar ? "Aprovando…" : "Recusando…") : label}
          </span>
        </button>
      )}
      {state.message ? (
        <p
          className={`text-[11px] ${lightMsg ? (state.ok ? "text-emerald-700" : "text-red-600") : state.ok ? "text-eid-primary-300" : "text-red-300"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
