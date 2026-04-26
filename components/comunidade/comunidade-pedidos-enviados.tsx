"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { cancelarPedidoMatchPendente, type CancelarPedidoPendenteState } from "@/app/comunidade/actions";

type Item = {
  id: number;
  adversarioNome: string;
  adversarioAvatarUrl?: string | null;
  esporte: string;
  modalidade: string;
};

const initial: CancelarPedidoPendenteState = { ok: false, message: "" };

export function ComunidadePedidosEnviados({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState(cancelarPedidoMatchPendente, initial);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (state.ok) {
      setConfirmId(null);
      window.location.reload();
    }
  }, [state.ok]);

  if (items.length === 0) {
    return <p className="mt-2 text-xs text-eid-text-secondary">Sem pedidos enviados aguardando resposta.</p>;
  }

  const err = !state.ok && "message" in state && state.message ? state.message : null;

  return (
    <div className="mt-2 space-y-2">
      {err ? <p className="text-xs text-red-300">{err}</p> : null}
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.id} className="relative rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
            <div className="flex items-start gap-2">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60">
                {m.adversarioAvatarUrl ? (
                  <Image src={m.adversarioAvatarUrl} alt="" fill unoptimized className="object-cover object-center" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-eid-primary-300">EID</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-eid-fg">{m.adversarioNome}</p>
                <p className="text-[10px] text-eid-text-secondary">
                  {m.esporte} · {m.modalidade === "individual" ? "individual" : m.modalidade}
                </p>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <span className="rounded-full border border-amber-400/40 bg-amber-500/18 px-1.5 py-[1px] text-[7px] font-extrabold uppercase leading-none text-[color:color-mix(in_srgb,var(--eid-warning-500)_86%,var(--eid-fg)_14%)]">
                  Aguardando
                </span>
                <form action={formAction}>
                  <input type="hidden" name="match_id" value={String(m.id)} />
                  <button
                    type="button"
                    disabled={pending}
                    className="inline-flex items-center justify-center rounded-md border border-red-700 bg-red-700 px-1.5 font-black tracking-[0.01em] text-white transition hover:border-red-800 hover:bg-red-800 disabled:opacity-60"
                    data-eid-cancel-pendente-btn="true"
                    onClick={() => setConfirmId(m.id)}
                    style={{
                      minHeight: "14px",
                      height: "14px",
                      lineHeight: "1",
                      fontSize: "8px",
                      paddingTop: "0",
                      paddingBottom: "0",
                      paddingLeft: "5px",
                      paddingRight: "5px",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      borderColor: "#dc2626",
                      opacity: 1,
                    }}
                  >
                    {pending ? "Cancelando..." : "Cancelar"}
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {confirmId ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-xl">
            <p className="text-sm font-black uppercase tracking-[0.08em] text-eid-primary-300">Confirmar cancelamento</p>
            <p className="mt-2 text-sm text-eid-text-secondary">Tem certeza que deseja cancelar este pedido de desafio?</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 text-xs font-bold text-eid-fg"
                onClick={() => setConfirmId(null)}
              >
                Voltar
              </button>
              <form action={formAction} className="flex-1">
                <input type="hidden" name="match_id" value={String(confirmId)} />
                <button
                  type="submit"
                  className="inline-flex min-h-[32px] w-full items-center justify-center rounded-lg border border-red-700 bg-red-700 px-3 text-xs font-black text-white"
                >
                  Confirmar cancelamento
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
