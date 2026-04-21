"use client";

import { useActionState } from "react";
import {
  organizerAtualizarInscricaoStatus,
  organizerCancelarInscricaoComEstorno,
  organizerSubstituirInscricao,
  type TorneioStaffActionState,
} from "@/app/torneios/actions";

const initialState: TorneioStaffActionState = { ok: false, message: "" };

export function TorneioInscricoesManager({
  torneioId,
  inscricao,
}: {
  torneioId: number;
  inscricao: {
    id: number;
    label: string;
    tipo: string;
    status: string;
    paymentStatus: string;
    pagante: string;
  };
}) {
  const [statusState, statusAction, statusPending] = useActionState(organizerAtualizarInscricaoStatus, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(organizerCancelarInscricaoComEstorno, initialState);
  const [replaceState, replaceAction, replacePending] = useActionState(organizerSubstituirInscricao, initialState);

  return (
    <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
      <p className="text-sm font-bold text-eid-fg">{inscricao.label}</p>
      <p className="mt-1 text-[11px] text-eid-text-secondary">
        {inscricao.tipo} · status {inscricao.status} · pagamento {inscricao.paymentStatus} · pagante {inscricao.pagante}
      </p>

      <form action={statusAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="torneio_id" value={torneioId} />
        <input type="hidden" name="inscricao_id" value={inscricao.id} />
        <select
          name="status_inscricao"
          defaultValue={inscricao.status}
          className="eid-input-dark rounded-lg px-2 py-1.5 text-xs text-eid-fg"
        >
          <option value="pendente">Pendente</option>
          <option value="confirmada">Confirmada</option>
          <option value="aprovada">Aprovada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button type="submit" disabled={statusPending} className="rounded-lg border border-eid-primary-500/35 px-2.5 py-1 text-xs font-bold text-eid-primary-300">
          Salvar status
        </button>
      </form>
      {statusState.message ? <p className={`mt-2 text-xs ${statusState.ok ? "text-emerald-300" : "text-red-300"}`}>{statusState.message}</p> : null}

      <form action={cancelAction} className="mt-3">
        <input type="hidden" name="torneio_id" value={torneioId} />
        <input type="hidden" name="inscricao_id" value={inscricao.id} />
        <button type="submit" disabled={cancelPending} className="rounded-lg border border-red-500/35 px-2.5 py-1 text-xs font-bold text-red-300">
          Cancelar + estornar no Asaas
        </button>
      </form>
      {cancelState.message ? <p className={`mt-2 text-xs ${cancelState.ok ? "text-emerald-300" : "text-red-300"}`}>{cancelState.message}</p> : null}

      {inscricao.tipo === "atleta" ? (
        <form action={replaceAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="torneio_id" value={torneioId} />
          <input type="hidden" name="inscricao_id" value={inscricao.id} />
          <input
            name="novo_usuario_id"
            placeholder="UUID do novo atleta"
            className="eid-input-dark rounded-lg px-2 py-1.5 text-xs text-eid-fg"
          />
          <button type="submit" disabled={replacePending} className="rounded-lg border border-eid-action-500/35 px-2.5 py-1 text-xs font-bold text-eid-action-400">
            Substituir atleta
          </button>
        </form>
      ) : null}
      {replaceState.message ? <p className={`mt-2 text-xs ${replaceState.ok ? "text-emerald-300" : "text-red-300"}`}>{replaceState.message}</p> : null}
    </div>
  );
}
