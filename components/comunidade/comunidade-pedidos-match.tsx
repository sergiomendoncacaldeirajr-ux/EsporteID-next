"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { responderPedidoMatch, type ResponderMatchState } from "@/app/comunidade/actions";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import type { PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { DESAFIO_FLOW_CTA_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

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
                  className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-2 min-h-[36px] max-w-fit px-3 py-1.5 normal-case no-underline hover:underline`}
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
              <form action={formAction} className="min-w-0 flex-1 sm:flex-none sm:min-w-[11rem]">
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button type="submit" disabled={pending} className={`${DESAFIO_FLOW_CTA_CLASS} w-full`}>
                  <DesafioFlowCtaIcon />
                  <span>{pending ? "Salvando…" : "Aceitar"}</span>
                </button>
              </form>
              <form action={formAction} className="min-w-0 flex-1 sm:flex-none sm:min-w-[9rem]">
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button
                  type="submit"
                  disabled={pending}
                  className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full hover:border-red-400/45 hover:text-red-200`}
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
