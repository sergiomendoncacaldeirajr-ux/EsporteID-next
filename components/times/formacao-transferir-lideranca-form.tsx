"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { transferirLiderancaDaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

type Props = {
  timeId: number;
  novoLiderUsuarioId: string;
  /** Classes do botão (compacto na lista de membros). */
  className?: string;
};

export function FormacaoTransferirLiderancaForm({ timeId, novoLiderUsuarioId, className }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(transferirLiderancaDaEquipe, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, state.message, router]);

  return (
    <form
      ref={formRef}
      action={action}
      className="min-w-0 flex-1"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Tem certeza que deseja transferir a liderança? Você permanece na formação; apenas o outro integrante passa a ser o líder na gestão."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="time_id" value={String(timeId)} />
      <input type="hidden" name="novo_lider_usuario_id" value={novoLiderUsuarioId} />
      <button
        type="submit"
        disabled={pending}
        className={
          className ??
          "flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border border-eid-primary-500/35 px-1 py-1.5 text-center text-[9px] font-semibold leading-snug text-eid-primary-300 disabled:opacity-60 sm:text-[10px]"
        }
      >
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-eid-primary-400 border-t-transparent"
              aria-hidden
            />
            Transferindo…
          </span>
        ) : (
          "Transferir liderança"
        )}
      </button>
      {state.message && !state.ok ? (
        <p className="mt-1 text-[9px] leading-snug text-red-300">{state.message}</p>
      ) : null}
    </form>
  );
}
