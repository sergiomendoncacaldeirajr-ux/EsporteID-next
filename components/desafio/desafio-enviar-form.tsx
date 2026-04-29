"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { solicitarDesafioMatch, type SolicitarDesafioState } from "@/app/desafio/actions";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";

type Props = {
  modalidade: "individual" | "dupla" | "time";
  esporteId: number;
  alvoUsuarioId?: string;
  alvoTimeId?: number;
  /** ranking = pontos EID/agenda; amistoso = só combinar (WhatsApp), sem ranking. */
  finalidade?: "ranking" | "amistoso";
  className?: string;
};

const initial: SolicitarDesafioState = { ok: false, message: "" };

export function DesafioEnviarForm({
  modalidade,
  esporteId,
  alvoUsuarioId,
  alvoTimeId,
  finalidade = "ranking",
  className,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(solicitarDesafioMatch, initial);

  useEffect(() => {
    if (!state.ok) return;
    try {
      if (typeof window !== "undefined" && window.parent !== window.self) {
        const next = new URL(state.redirectTo, window.location.origin);
        if (next.origin === window.location.origin) {
          window.parent.location.assign(next.pathname + next.search + next.hash);
          return;
        }
      }
    } catch {
      /* parent inacessível (cross-origin) */
    }
    router.push(state.redirectTo);
  }, [state, router]);

  const err = !state.ok && state.message ? state.message : null;

  return (
    <form action={formAction} className={`space-y-4 ${className ?? "mt-4"}`.trim()}>
      <input type="hidden" name="modalidade" value={modalidade === "individual" ? "individual" : modalidade} />
      <input type="hidden" name="esporte_id" value={String(esporteId)} />
      <input type="hidden" name="finalidade" value={finalidade} />
      {modalidade === "individual" && alvoUsuarioId ? (
        <input type="hidden" name="alvo_usuario_id" value={alvoUsuarioId} />
      ) : null}
      {(modalidade === "dupla" || modalidade === "time") && alvoTimeId != null ? (
        <input type="hidden" name="alvo_time_id" value={String(alvoTimeId)} />
      ) : null}

      {err ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>
      ) : null}

      <button type="submit" disabled={pending} className={DESAFIO_FLOW_CTA_BLOCK_CLASS}>
        <DesafioFlowCtaIcon />
        <span>
          {pending
            ? "Enviando…"
            : finalidade === "amistoso"
              ? "Confirmar desafio amistoso"
              : "Confirmar desafio de ranking"}
        </span>
      </button>
    </form>
  );
}
