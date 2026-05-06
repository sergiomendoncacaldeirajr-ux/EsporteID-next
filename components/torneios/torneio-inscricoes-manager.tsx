"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  organizerAtualizarInscricaoStatus,
  organizerCancelarInscricaoComEstorno,
  organizerSubstituirInscricao,
  type TorneioStaffActionState,
} from "@/app/torneios/actions";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";

const initialState: TorneioStaffActionState = { ok: false, message: "" };

function pagamentoTorneioJaPago(ps: string) {
  const s = ps.toLowerCase();
  return s === "paid" || s === "received" || s === "confirmado";
}

export function TorneioInscricoesManager({
  torneioId,
  inscricao,
  mostrarSimulacaoPagamentoTeste,
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
  mostrarSimulacaoPagamentoTeste?: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState(organizerAtualizarInscricaoStatus, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(organizerCancelarInscricaoComEstorno, initialState);
  const [replaceState, replaceAction, replacePending] = useActionState(organizerSubstituirInscricao, initialState);
  const router = useRouter();
  const [simBusy, setSimBusy] = useState(false);
  const [simMsg, setSimMsg] = useState<string | null>(null);

  async function simularPagamento() {
    setSimMsg(null);
    setSimBusy(true);
    try {
      const res = await fetch("/api/dev/simulate-asaas-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "torneios",
          torneio_id: torneioId,
          torneio_inscricao_id: inscricao.id,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSimMsg(data.error ?? `Erro ${res.status}`);
        return;
      }
      setSimMsg("Pagamento simulado. Atualizando…");
      router.refresh();
    } finally {
      setSimBusy(false);
    }
  }

  const podeSimularTorneio =
    Boolean(mostrarSimulacaoPagamentoTeste) && !pagamentoTorneioJaPago(inscricao.paymentStatus);

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

      {podeSimularTorneio ? (
        <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">Modo teste</p>
          <button
            type="button"
            disabled={simBusy}
            onClick={() => void simularPagamento()}
            className="mt-1 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {simBusy ? "…" : "Simular pagamento da inscrição"}
          </button>
          {simMsg ? <p className="mt-1 text-[11px] text-amber-50">{simMsg}</p> : null}
        </div>
      ) : null}

      <form action={cancelAction} className="mt-3">
        <input type="hidden" name="torneio_id" value={torneioId} />
        <input type="hidden" name="inscricao_id" value={inscricao.id} />
        <EidCancelButton
          type="submit"
          loading={cancelPending}
          label="Cancelar + estornar no Asaas"
          loadingLabel="Cancelando..."
          className="rounded-lg !text-xs"
        />
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
