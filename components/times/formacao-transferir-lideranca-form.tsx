"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { transferirLiderancaDaEquipe, type TeamActionState } from "@/app/times/actions";
import { TransferirLiderancaConfirmPanel } from "@/components/times/transferir-lideranca-confirm-panel";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { eidPostRevalidateCurrentAndBroadcast } from "@/lib/realtime/eid-route-refresh-client";

const initial: TeamActionState = { ok: false, message: "" };

type Props = {
  timeId: number;
  novoLiderUsuarioId: string;
  novoLiderNome: string;
  novoLiderAvatarUrl?: string | null;
  formacaoTipo: "dupla" | "time";
  /** Classes do botão inicial (compacto na lista de membros). */
  className?: string;
  /** Quando o painel de confirmação abre/fecha (ex.: esconder “Remover” no mesmo flex). */
  onTransferFlowOpenChange?: (open: boolean) => void;
};

export function FormacaoTransferirLiderancaForm({
  timeId,
  novoLiderUsuarioId,
  novoLiderNome,
  novoLiderAvatarUrl = null,
  formacaoTipo,
  className,
  onTransferFlowOpenChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, action, pending] = useActionState(transferirLiderancaDaEquipe, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const setConfirmOpen = useCallback(
    (open: boolean) => {
      setShowConfirm(open);
      onTransferFlowOpenChange?.(open);
    },
    [onTransferFlowOpenChange],
  );

  useEffect(() => {
    if (!state.ok || !state.message) return;
    formRef.current?.reset();
    let cancelled = false;
    void (async () => {
      await eidPostRevalidateCurrentAndBroadcast(pathname || "/");
      if (cancelled) return;
      router.refresh();
      if (cancelled) return;
      window.setTimeout(() => setConfirmOpen(false), 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [state.ok, state.message, router, pathname, setConfirmOpen]);

  if (showConfirm) {
    return (
      <div className="w-full min-w-0 space-y-2">
        <TransferirLiderancaConfirmPanel
          novoLiderNome={novoLiderNome}
          novoLiderAvatarUrl={novoLiderAvatarUrl}
          formacaoTipo={formacaoTipo}
          actions={
            <>
              <EidCancelButton
                type="button"
                compact
                disabled={pending}
                label="Cancelar"
                className="!w-full border-[color:color-mix(in_srgb,var(--eid-border-subtle)_70%,transparent)] bg-eid-surface/60 text-eid-fg hover:bg-eid-surface sm:!w-auto sm:min-w-[7.5rem]"
                onClick={() => setConfirmOpen(false)}
              />
              <form ref={formRef} action={action} className="w-full sm:w-auto sm:min-w-[12rem]">
                <input type="hidden" name="time_id" value={String(timeId)} />
                <input type="hidden" name="novo_lider_usuario_id" value={novoLiderUsuarioId} />
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/14 px-4 text-[12px] font-black uppercase tracking-[0.06em] text-eid-primary-300 transition hover:bg-eid-primary-500/22 disabled:opacity-60 eid-light:border-sky-300 eid-light:bg-sky-600 eid-light:text-white eid-light:hover:bg-sky-700"
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-eid-primary-400 border-t-transparent eid-light:border-white eid-light:border-t-transparent"
                        aria-hidden
                      />
                      Transferindo…
                    </span>
                  ) : (
                    "Confirmar transferência"
                  )}
                </button>
              </form>
            </>
          }
        />
        {state.message && !state.ok ? (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200 eid-light:text-red-800">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
        className={
          className ??
          "flex h-9 min-h-9 w-full min-w-0 items-center justify-center rounded-lg border border-eid-primary-500/45 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-eid-primary-300 transition hover:bg-eid-primary-500/10 disabled:opacity-60 eid-light:border-sky-700/40 eid-light:bg-sky-50 eid-light:text-sky-950 eid-light:hover:bg-sky-100 sm:px-2 sm:text-[11px]"
        }
      >
        Transferir liderança
      </button>
      {state.message && !state.ok ? (
        <p className="mt-1 text-[9px] leading-snug text-red-300">{state.message}</p>
      ) : null}
    </>
  );
}
