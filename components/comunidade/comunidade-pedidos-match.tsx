"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { responderPedidoMatch, type ResponderMatchState } from "@/app/comunidade/actions";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { EidCityState } from "@/components/ui/eid-city-state";
import type { PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
} from "@/lib/desafio/flow-ui";
import {
  EID_SOCIAL_CARD_FOOTER,
  EID_SOCIAL_CARD_SHELL,
  EID_SOCIAL_GRID_3,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";

export type PedidoMatchItem = {
  id: number;
  dataSolicitacao?: string | null;
  desafianteNome: string;
  desafianteId: string;
  desafianteAvatarUrl?: string | null;
  desafianteLocalizacao?: string | null;
  desafianteNotaEid?: number | null;
  esporte: string;
  esporteId: number;
  rankingPosicao?: number | null;
  modalidade: string;
  /** Dupla/time desafiante (foto e nome da formação, não do líder). */
  formacaoDesafiante?: {
    id: number;
    nome: string | null;
    escudo: string | null;
    localizacao: string | null;
    tipo: "dupla" | "time";
    eidTime: number;
    pontosRanking: number;
  } | null;
  timeNome?: string | null;
  finalidade?: "ranking" | "amistoso";
  rankingPreview?: PedidoRankingPreview | null;
};

function firstNamePedido(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "Atleta";
  return clean.split(/\s+/)[0] ?? clean;
}

export function iniciaisFormacao(nome: string | null | undefined): string {
  const n = String(nome ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const initial: ResponderMatchState = { ok: false, message: "" };

export function ComunidadePedidosMatch({ items }: { items: PedidoMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderPedidoMatch, initial);
  const [showStatsHint, setShowStatsHint] = useState(true);
  const [clickedAction, setClickedAction] = useState<{ matchId: number; aceitar: boolean } | null>(null);
  const err = !state.ok && state.message ? state.message : null;
  const okMsg = state.ok ? "Resposta registrada." : null;

  useEffect(() => {
    if (state.ok) {
      setClickedAction(null);
      router.refresh();
    }
  }, [state.ok, router]);

  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-xl bg-eid-surface/30 p-2.5 text-[11px] text-eid-text-secondary">
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
        {items.map((m) => {
          const f = m.formacaoDesafiante;
          const tituloCard = (f?.nome?.trim() ? f.nome : null) ?? m.desafianteNome;
          const localCard = (f?.localizacao?.trim() ? f.localizacao : null) ?? m.desafianteLocalizacao;
          /** `formacaoDesafiante.id` é sempre `times.id` (dupla ou time no radar). */
          const statsHref = f
            ? `/perfil-time/${f.id}/eid/${m.esporteId}?from=${encodeURIComponent("/comunidade")}`
            : `/perfil/${m.desafianteId}/eid/${m.esporteId}?from=${encodeURIComponent("/comunidade")}`;
          const seloEid =
            m.rankingPreview?.kind === "coletivo"
              ? m.rankingPreview.coletivo.opponentTeam.eidTime
              : m.rankingPreview?.kind === "individual"
                ? m.rankingPreview.perspective.notaEidNow
                : f
                  ? f.eidTime
                  : Number(m.desafianteNotaEid ?? 0);
          const recebido = formatSolicitacaoParts(m.dataSolicitacao);
          const avatarPedidoRecebido =
            f?.escudo?.trim() ? (
              <Image
                src={f.escudo.trim()}
                alt=""
                fill
                unoptimized
                className="h-full w-full rounded-full object-cover object-center"
              />
            ) : f ? (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-surface text-[10px] font-black text-eid-primary-300">
                {iniciaisFormacao(f.nome)}
              </div>
            ) : m.desafianteAvatarUrl ? (
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
            );
          return (
            <li
              key={m.id}
              className={`${EID_SOCIAL_CARD_SHELL} text-sm md:rounded-2xl md:border-eid-primary-500/25`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 hidden h-20 w-20 rounded-full bg-eid-primary-500/10 blur-2xl md:block" />
              <div className="absolute right-3 top-3 z-[1] flex flex-col items-end gap-1">
                {m.finalidade === "amistoso" ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
                    Amistoso
                  </span>
                ) : (
                  <span className="rounded-full border border-eid-primary-400/55 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_30%,transparent),color-mix(in_srgb,var(--eid-primary-700)_26%,transparent))] px-2 py-0.5 text-[9px] font-bold uppercase text-eid-primary-100 shadow-[0_0_0_1px_color-mix(in_srgb,var(--eid-primary-500)_25%,transparent),0_6px_14px_-10px_color-mix(in_srgb,var(--eid-primary-500)_75%,transparent)]">
                    Ranking
                  </span>
                )}
                <EidPendingBadge label="Pendente" />
              </div>

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Desafiante</p>
                  <div className="mt-1 flex w-full flex-col items-center px-0.5 py-1">
                    <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg md:text-xs">
                      {firstNamePedido(tituloCard)}
                    </p>
                    <div className="relative mt-1 h-12 w-12 shrink-0 md:h-14 md:w-14">
                      {m.rankingPosicao && m.rankingPosicao > 0 ? (
                        <span className="absolute -top-3 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-eid-primary-400/55 bg-eid-primary-500/20 px-1 py-[1px] text-[7px] font-black uppercase text-eid-primary-100">
                          #{m.rankingPosicao}
                        </span>
                      ) : null}
                      <ProfileEditDrawerTrigger
                        href={statsHref}
                        title={f ? `Estatísticas da formação ${tituloCard}` : `Estatísticas EID de ${tituloCard}`}
                        fullscreen
                        topMode="backOnly"
                        className="relative block h-full w-full overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/65"
                      >
                        {avatarPedidoRecebido}
                      </ProfileEditDrawerTrigger>
                    </div>
                    <div className="mt-0.5">
                      <ProfileEidPerformanceSeal notaEid={seloEid} compact className="scale-125" />
                    </div>
                    <EidCityState location={localCard?.trim() ? localCard : null} compact align="center" className="mt-1 w-full" />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                  <div className="w-full">
                    <p className="text-[11px] tabular-nums text-eid-text-secondary">{recebido.date}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{recebido.time}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Recebido</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                      <SportGlyphIcon sportName={m.esporte} />
                      <span>{m.esporte}</span>
                    </span>
                    {m.timeNome ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                        <span>{m.timeNome}</span>
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
                      <ModalidadeGlyphIcon
                        modalidade={
                          String(m.modalidade).trim().toLowerCase() === "time"
                            ? "time"
                            : String(m.modalidade).trim().toLowerCase() === "individual"
                              ? "individual"
                              : "dupla"
                        }
                      />
                      {m.modalidade === "individual" ? "Individual" : m.modalidade}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col items-center px-2 pb-3 pt-1 text-center sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">Resposta</p>
                  <p className="mt-3 max-w-[8rem] text-[10px] font-semibold leading-snug text-eid-text-secondary">
                    Use os botões abaixo para aceitar ou recusar o desafio.
                  </p>
                </div>
              </div>

              {showStatsHint ? (
                <p className="px-3 pb-2 text-[10px] text-eid-text-secondary md:px-4">
                  Toque na foto para abrir as estatísticas EID em tela cheia.
                </p>
              ) : null}
              {m.finalidade === "ranking" && m.rankingPreview ? (
                <div className="px-2 md:px-3">
                  <DesafioImpactoResumo
                    esporteNome={m.esporte}
                    regras={m.rankingPreview.regras}
                    individual={m.rankingPreview.kind === "individual" ? m.rankingPreview.perspective : null}
                    coletivo={m.rankingPreview.kind === "coletivo" ? m.rankingPreview.coletivo : null}
                  />
                </div>
              ) : null}
              <div
                className={`${EID_SOCIAL_CARD_FOOTER} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !mt-0 !bg-[color:color-mix(in_srgb,var(--eid-surface)_45%,transparent)]`}
              >
                <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                  <input type="hidden" name="match_id" value={String(m.id)} />
                  <input type="hidden" name="aceitar" value="true" />
                  <EidSocialAceitarButton
                    pending={pending}
                    busy={pending && clickedAction?.matchId === m.id && clickedAction.aceitar}
                    onClick={() => setClickedAction({ matchId: m.id, aceitar: true })}
                  />
                </form>
                <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                  <input type="hidden" name="match_id" value={String(m.id)} />
                  <input type="hidden" name="aceitar" value="false" />
                  <EidSocialRecusarButton
                    pending={pending}
                    busy={pending && clickedAction?.matchId === m.id && !clickedAction.aceitar}
                    withDesafioRecusarMarker
                    onClick={() => setClickedAction({ matchId: m.id, aceitar: false })}
                  />
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
