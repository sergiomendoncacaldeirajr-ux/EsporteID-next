"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { solicitarDesafioMatch, type SolicitarDesafioState } from "@/app/desafio/actions";

type Props = {
  modalidade: "individual" | "dupla" | "time";
  esporteId: number;
  alvoUsuarioId?: string;
  alvoTimeId?: number;
  /** ranking = pontos EID/agenda; amistoso = só combinar (WhatsApp), sem ranking. */
  finalidade?: "ranking" | "amistoso";
};

const initial: SolicitarDesafioState = { ok: false, message: "" };

export function DesafioEnviarForm({
  modalidade,
  esporteId,
  alvoUsuarioId,
  alvoTimeId,
  finalidade = "ranking",
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(solicitarDesafioMatch, initial);

  useEffect(() => {
    if (state.ok) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  const err = !state.ok && state.message ? state.message : null;

  return (
    <form action={formAction} className="mt-4 space-y-4">
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

      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {pending ? "Enviando…" : finalidade === "amistoso" ? "Confirmar match amistoso" : "Confirmar match de ranking"}
      </button>
    </form>
  );
}
