"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { responderConviteEquipe, type ResponderConviteState } from "@/app/comunidade/actions";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { DESAFIO_FLOW_CTA_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

export type ConviteTimeItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  esporteNome: string;
  convidadoPor: string;
};

const initial: ResponderConviteState = { ok: false, message: "" };

export function ComunidadeConvitesTime({ items }: { items: ConviteTimeItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderConviteEquipe, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Nenhum convite de equipe no momento.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {!state.ok && state.message ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{state.message}</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.28)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-eid-fg">{c.equipeNome}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  {(c.equipeTipo ?? "time").toUpperCase()} · {c.esporteNome} · convite de {c.convidadoPor}
                </p>
              </div>
              <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-200">
                Convite pendente
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={formAction} className="min-w-0 flex-1 sm:flex-none">
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button type="submit" disabled={pending} className={`${DESAFIO_FLOW_CTA_CLASS} w-full sm:w-auto`}>
                  <DesafioFlowCtaIcon />
                  <span>{pending ? "Salvando…" : "Aceitar"}</span>
                </button>
              </form>
              <form action={formAction} className="min-w-0 flex-1 sm:flex-none sm:min-w-[9rem]">
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button type="submit" disabled={pending} className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full`}>
                  Recusar
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
