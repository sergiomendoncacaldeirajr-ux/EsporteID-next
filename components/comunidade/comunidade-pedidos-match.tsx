"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { responderPedidoMatch, type ResponderMatchState } from "@/app/comunidade/actions";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import type { PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";

export type PedidoMatchItem = {
  id: number;
  desafianteNome: string;
  desafianteId: string;
  esporte: string;
  modalidade: string;
  timeNome?: string | null;
  finalidade?: "ranking" | "amistoso";
  rankingPreview?: PedidoRankingPreview | null;
};

const initial: ResponderMatchState = { ok: false, message: "" };

export function ComunidadePedidosMatch({ items }: { items: PedidoMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderPedidoMatch, initial);
  const err = !state.ok && state.message ? state.message : null;
  const okMsg = state.ok ? "Resposta registrada." : null;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Nenhum pedido pendente. Quando alguém te desafiar, aparece aqui.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {okMsg ? (
        <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
      ) : null}
      {err ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>
      ) : null}

      <ul className="space-y-3 md:space-y-4">
        {items.map((m) => (
          <li
            key={m.id}
            className="relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm md:rounded-2xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:to-eid-primary-500/[0.06] md:p-4 md:shadow-md md:shadow-black/15"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 hidden h-20 w-20 rounded-full bg-eid-primary-500/10 blur-2xl md:block" />
            <div className="relative flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{m.desafianteNome}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  {m.esporte} · {m.modalidade}
                  {m.timeNome ? ` · ${m.timeNome}` : ""}
                  {m.finalidade === "amistoso" ? " · amistoso (sem ranking)" : ""}
                </p>
                <Link
                  href={`/perfil/${m.desafianteId}?from=/comunidade`}
                  className="mt-2 inline-flex text-xs font-bold text-eid-primary-300 hover:underline"
                >
                  Ver perfil →
                </Link>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-200">
                  Pendente
                </span>
                {m.finalidade === "amistoso" ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
                    Amistoso
                  </span>
                ) : (
                  <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-primary-200">
                    Ranking
                  </span>
                )}
              </div>
            </div>
            {m.finalidade === "ranking" && m.rankingPreview ? (
              <DesafioImpactoResumo
                esporteNome={m.esporte}
                regras={m.rankingPreview.regras}
                individual={m.rankingPreview.kind === "individual" ? m.rankingPreview.perspective : null}
                coletivo={m.rankingPreview.kind === "coletivo" ? m.rankingPreview.coletivo : null}
              />
            ) : null}
            <div className="relative mt-4 flex flex-wrap gap-2">
              <form action={formAction}>
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-eid-action-500/50 bg-eid-action-500/15 px-4 py-2 text-xs font-bold text-eid-action-500 transition hover:bg-eid-action-500/25 disabled:opacity-50"
                >
                  {pending ? "Salvando…" : "Aceitar"}
                </button>
              </form>
              <form action={formAction}>
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-text-secondary transition hover:border-red-400/40 hover:text-red-200 disabled:opacity-50"
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
