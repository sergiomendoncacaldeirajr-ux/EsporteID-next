"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { responderConviteEquipe, type ResponderConviteState } from "@/app/comunidade/actions";

export type ConviteTimeItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  esporteNome: string;
  convidadoPor: string;
};

const initial: ResponderConviteState = { ok: false, message: "" };

export function ComunidadeConvitesTime({ items }: { items: ConviteTimeItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderConviteEquipe, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Nenhum convite de equipe no momento.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {!state.ok && state.message ? <p className="text-xs text-red-300">{state.message}</p> : null}
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
            <p className="text-sm font-semibold text-eid-fg">{c.equipeNome}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">
              {(c.equipeTipo ?? "time").toUpperCase()} · {c.esporteNome} · convite de {c.convidadoPor}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={formAction}>
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button type="submit" disabled={pending} className="eid-btn-primary rounded-xl px-3 py-1.5 text-xs font-semibold">
                  {pending ? "Salvando..." : "Aceitar"}
                </button>
              </form>
              <form action={formAction}>
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary"
                >
                  Recusar
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
