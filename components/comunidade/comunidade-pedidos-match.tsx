"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { responderPedidoMatch, type ResponderMatchState } from "@/app/comunidade/actions";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import type { PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { sportIconEmoji } from "@/lib/perfil/sport-icon-emoji";
import {
  PEDIDO_ACEITAR_BTN_CLASS,
  PEDIDO_MATCH_ACAO_FORM_CLASS,
  PEDIDO_MATCH_ACOES_ROW_CLASS,
  PEDIDO_RECUSAR_BTN_CLASS,
} from "@/lib/desafio/flow-ui";

export type PedidoMatchItem = {
  id: number;
  desafianteNome: string;
  desafianteId: string;
  desafianteAvatarUrl?: string | null;
  esporte: string;
  esporteId: number;
  rankingPosicao?: number | null;
  modalidade: string;
  timeNome?: string | null;
  finalidade?: "ranking" | "amistoso";
  rankingPreview?: PedidoRankingPreview | null;
};

const initial: ResponderMatchState = { ok: false, message: "" };

export function ComunidadePedidosMatch({ items }: { items: PedidoMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderPedidoMatch, initial);
  const [showStatsHint, setShowStatsHint] = useState(true);
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
    <div className="mt-3 space-y-3" onClick={() => setShowStatsHint(false)}>
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
            className="relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-surface)_92%))] p-3 text-sm shadow-[0_10px_20px_-14px_rgba(15,23,42,0.35)] md:rounded-2xl md:border-eid-primary-500/25 md:p-4 md:shadow-md md:shadow-black/15"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 hidden h-20 w-20 rounded-full bg-eid-primary-500/10 blur-2xl md:block" />
            <div className="relative mt-1.5 flex min-w-0 items-start gap-2.5 pr-24">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="relative mt-1 h-14 w-14 shrink-0">
                  {m.rankingPosicao && m.rankingPosicao > 0 ? (
                    <span className="absolute -top-4 left-1/2 z-[3] -translate-x-1/2 rounded-full border border-eid-primary-400/55 bg-eid-primary-500/20 px-1.5 py-[1px] text-[8px] font-black uppercase text-eid-primary-100 shadow-[0_4px_10px_-8px_color-mix(in_srgb,var(--eid-primary-500)_85%,transparent)]">
                      #{m.rankingPosicao}
                    </span>
                  ) : null}
                  <ProfileEditDrawerTrigger
                    href={`/perfil/${m.desafianteId}/eid/${m.esporteId}?from=${encodeURIComponent("/comunidade")}`}
                    title={`Estatísticas EID de ${m.desafianteNome}`}
                    fullscreen
                    topMode="backOnly"
                    className="block h-14 w-14 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/65"
                  >
                    {m.desafianteAvatarUrl ? (
                      <Image
                        src={m.desafianteAvatarUrl}
                        alt=""
                        fill
                        unoptimized
                        className="h-full w-full rounded-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-surface text-[10px] font-black text-eid-primary-300">
                        EID
                      </div>
                    )}
                  </ProfileEditDrawerTrigger>
                  <div className="absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2">
                    <ProfileEidPerformanceSeal
                      notaEid={m.rankingPreview?.kind === "individual" ? m.rankingPreview.perspective.notaEidNow : 0}
                      compact
                      className="scale-125"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{m.desafianteNome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <p className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                      <span aria-hidden>{sportIconEmoji(m.esporte)}</span>
                      <span>{m.esporte}</span>
                    </p>
                    {m.timeNome ? (
                      <p className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                        <span>{m.timeNome}</span>
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                    {m.modalidade === "individual" ? "Desafio individual" : `Desafio ${m.modalidade}`}
                  </p>
              </div>
              </div>
              <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
                {m.finalidade === "amistoso" ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
                    Amistoso
                  </span>
                ) : (
                  <span className="rounded-full border border-eid-primary-400/55 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_30%,transparent),color-mix(in_srgb,var(--eid-primary-700)_26%,transparent))] px-2 py-0.5 text-[9px] font-bold uppercase text-eid-primary-100 shadow-[0_0_0_1px_color-mix(in_srgb,var(--eid-primary-500)_25%,transparent),0_6px_14px_-10px_color-mix(in_srgb,var(--eid-primary-500)_75%,transparent)]">
                    Ranking
                  </span>
                )}
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-warning-500)_82%,var(--eid-fg)_18%)]">
                  Pendente
                </span>
              </div>
            </div>
            {showStatsHint ? (
              <p className="mt-2 text-[10px] text-eid-text-secondary">
                Toque na foto para abrir as estatísticas EID em tela cheia.
              </p>
            ) : null}
            {m.finalidade === "ranking" && m.rankingPreview ? (
              <DesafioImpactoResumo
                esporteNome={m.esporte}
                regras={m.rankingPreview.regras}
                individual={m.rankingPreview.kind === "individual" ? m.rankingPreview.perspective : null}
                coletivo={m.rankingPreview.kind === "coletivo" ? m.rankingPreview.coletivo : null}
              />
            ) : null}
            <div className={PEDIDO_MATCH_ACOES_ROW_CLASS}>
              <form action={formAction} className={PEDIDO_MATCH_ACAO_FORM_CLASS}>
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button type="submit" disabled={pending} className={PEDIDO_ACEITAR_BTN_CLASS}>
                  <span>{pending ? "Salvando…" : "Aceitar"}</span>
                </button>
              </form>
              <form action={formAction} className={PEDIDO_MATCH_ACAO_FORM_CLASS}>
                <input type="hidden" name="match_id" value={String(m.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button
                  type="submit"
                  disabled={pending}
                  data-eid-recusar-btn="true"
                  className={PEDIDO_RECUSAR_BTN_CLASS}
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
