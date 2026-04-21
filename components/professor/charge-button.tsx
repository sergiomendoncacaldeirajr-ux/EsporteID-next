"use client";

import { useState, useTransition } from "react";

export function ProfessorChargeButton({
  aulaAlunoId,
  disabled = false,
}: {
  aulaAlunoId: number;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const response = await fetch("/api/asaas/payments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ aulaAlunoId }),
            });
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
              chargeUrl?: string | null;
            };
            if (!response.ok) {
              setMessage(payload.error ?? "Não foi possível gerar a cobrança.");
              return;
            }
            setMessage(payload.chargeUrl ? "Cobrança criada. Abra no Asaas." : "Cobrança criada.");
            if (payload.chargeUrl) {
              window.open(payload.chargeUrl, "_blank", "noopener,noreferrer");
            }
          })
        }
        className="rounded-lg border border-eid-action-500/35 px-3 py-1.5 text-xs font-semibold text-eid-action-400 disabled:opacity-50"
      >
        {pending ? "Gerando..." : "Gerar cobrança"}
      </button>
      {message ? <p className="text-[11px] text-eid-text-secondary">{message}</p> : null}
    </div>
  );
}
