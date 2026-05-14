"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
  const [state, setState] = useState<SolicitarDesafioState>(initial);
  const [submitting, setSubmitting] = useState(false);

  function goToNext(redirectTo: string) {
    try {
      if (typeof window !== "undefined" && window.parent !== window.self) {
        const next = new URL(redirectTo, window.location.origin);
        if (next.origin === window.location.origin) {
          window.parent.location.assign(next.pathname + next.search + next.hash);
          return;
        }
      }
    } catch {
      /* parent inacessível (cross-origin) */
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setState(initial);

    const formData = new FormData(event.currentTarget);
    const result = await solicitarDesafioMatch(initial, formData);
    setState(result);

    if (result.ok) {
      goToNext(result.redirectTo);
      return;
    }
    setSubmitting(false);
  }

  const err = !state.ok && state.message ? state.message : null;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className ?? "mt-4"}`.trim()}>
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

      <button type="submit" disabled={submitting} className={DESAFIO_FLOW_CTA_BLOCK_CLASS}>
        <DesafioFlowCtaIcon />
        <span>
          {submitting
            ? "Enviando…"
            : finalidade === "amistoso"
              ? "Confirmar desafio amistoso"
              : "Confirmar desafio de ranking"}
        </span>
      </button>
    </form>
  );
}
