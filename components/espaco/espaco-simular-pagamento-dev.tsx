"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Pendente = {
  id: number;
  tipo: string;
  asaas_payment_id: string | null;
};

export function EspacoSimularPagamentoDev({
  espacoId,
  transacoesPendentes,
  asaasSubscriptionId,
}: {
  espacoId: number;
  transacoesPendentes: Pendente[];
  asaasSubscriptionId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch("/api/dev/simulate-asaas-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "locais", espaco_generico_id: espacoId, ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) {
      setMsg(data.error ?? `Erro ${res.status}`);
      return;
    }
    setMsg("Pagamento simulado. Atualizando…");
    router.refresh();
  }

  const hasPendenteComCobranca = transacoesPendentes.some((t) => t.asaas_payment_id);
  const showAssinatura = Boolean(asaasSubscriptionId);

  if (!hasPendenteComCobranca && !showAssinatura) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100/90">
        <p className="font-bold text-amber-200">Modo teste — simular Asaas</p>
        <p className="mt-1 text-amber-100/80">
          Não há cobrança pendente nem assinatura PaaS com ID no Asaas. Gere uma reserva/cobrança ou ative a recorrência
          primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100/90">
      <p className="font-bold text-amber-200">Modo teste — simular webhook Asaas</p>
      <p className="mt-1 text-amber-100/80">
        Ativado pelo admin em <strong className="font-semibold">Admin → Financeiro</strong> (ou variável local de dev).
        Confirma pagamento como RECEIVED usando a mesma lógica do webhook.
      </p>
      <ul className="mt-2 space-y-2">
        {transacoesPendentes.map((t) =>
          t.asaas_payment_id ? (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              <span className="text-amber-100/90">
                {t.tipo} · tx #{t.id}
              </span>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setBusy(`tx-${t.id}`);
                  void post({ transacao_id: t.id }).finally(() => setBusy(null));
                }}
                className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
              >
                {busy === `tx-${t.id}` ? "…" : "Simular pago"}
              </button>
            </li>
          ) : null
        )}
      </ul>
      {showAssinatura ? (
        <div className="mt-3 border-t border-amber-500/25 pt-3">
          <p className="text-amber-100/85">Assinatura PaaS (cobrança vinculada ao ID da subscription no Asaas)</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setBusy("sub");
              void post({ asaas_subscription_id: asaasSubscriptionId }).finally(() => setBusy(null));
            }}
            className="mt-1 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {busy === "sub" ? "…" : "Simular cobrança de assinatura (subscription)"}
          </button>
        </div>
      ) : null}
      {msg ? <p className="mt-2 text-[11px] text-amber-50">{msg}</p> : null}
    </div>
  );
}
