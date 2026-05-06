"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PagamentoRow = {
  id: number;
  status: string | null;
  asaas_payment_id: string | null;
};

export function ProfessorSimularPagamentoTeste({ pagamentos }: { pagamentos: PagamentoRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const elegiveis = pagamentos.filter((p) => {
    const st = String(p.status ?? "").toLowerCase();
    return p.asaas_payment_id && st !== "received" && st !== "refunded";
  });

  if (!elegiveis.length) return null;

  async function simular(pagamentoId: number) {
    setMsg(null);
    const res = await fetch("/api/dev/simulate-asaas-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "professores", professor_pagamento_id: pagamentoId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? `Erro ${res.status}`);
      return;
    }
    setMsg("Pagamento simulado. Atualizando…");
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100/90">
      <p className="font-bold text-amber-200">Modo teste — simular confirmação (professor)</p>
      <p className="mt-1 text-amber-100/80">
        Ligado pelo admin em <strong className="font-semibold">Admin → Financeiro</strong> (domínio Professores).
      </p>
      <ul className="mt-2 space-y-2">
        {elegiveis.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2">
            <span className="text-amber-100/90">Cobrança #{p.id}</span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setBusy(p.id);
                void simular(p.id).finally(() => setBusy(null));
              }}
              className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {busy === p.id ? "…" : "Simular pago"}
            </button>
          </li>
        ))}
      </ul>
      {msg ? <p className="mt-2 text-[11px] text-amber-50">{msg}</p> : null}
    </div>
  );
}
