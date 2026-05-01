"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { responderPedidoMatch, type ResponderMatchState } from "@/app/comunidade/actions";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { EidCityState } from "@/components/ui/eid-city-state";
import type { PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { Calendar, Clock, Clock3 } from "lucide-react";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
} from "@/lib/desafio/flow-ui";
import {
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_PANEL_ACOES_ROW,
  EID_SOCIAL_PANEL_BODY,
  EID_SOCIAL_PANEL_MATCH_RECEBIDO_SHELL,
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
              <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-field-bg text-[10px] font-black text-eid-text-muted">
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
              <div className="flex h-full w-full items-center justify-center rounded-full bg-eid-field-bg text-[10px] font-black text-eid-text-muted">
                EID
              </div>
            );
          const modalidadeKind =
            String(m.modalidade).trim().toLowerCase() === "time"
              ? "time"
              : String(m.modalidade).trim().toLowerCase() === "individual"
                ? "individual"
                : "dupla";
          return (
            <li key={m.id} className={`${EID_SOCIAL_PANEL_MATCH_RECEBIDO_SHELL} p-0 text-sm`}>
              <div className="absolute right-3 top-3 z-[1] flex flex-col items-end gap-1">
                {m.finalidade === "amistoso" ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-100 eid-light:border-emerald-200 eid-light:bg-emerald-50 eid-light:text-emerald-800">
                    Amistoso
                  </span>
                ) : (
                  <span className="rounded-full border border-sky-400/35 bg-sky-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-sky-100 eid-light:border-sky-200 eid-light:bg-sky-50 eid-light:text-[#1d4ed8]">
                    Ranking
                  </span>
                )}
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-amber-800 eid-dark:border-amber-300/65 eid-dark:bg-amber-950/55 eid-dark:text-amber-100 eid-light:border-amber-400 eid-light:bg-yellow-50 eid-light:text-amber-600">
                  <Clock3 className="h-3 w-3 shrink-0 text-amber-800 eid-dark:text-amber-100 eid-light:text-amber-600" strokeWidth={2.25} aria-hidden />
                  Pendente
                </span>
              </div>

              <div className={EID_SOCIAL_PANEL_BODY}>
                <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-eid-action-600">
                      <span className="shrink-0">Desafiante</span>
                    </p>
                    <div className="mt-3 flex w-full flex-col items-center px-0.5 py-0.5 text-center">
                      <p className="max-w-[12rem] truncate text-[15px] font-bold leading-tight text-eid-fg">
                        {firstNamePedido(tituloCard)}
                      </p>
                      <div className="relative mt-2 h-14 w-14 shrink-0">
                        {m.rankingPosicao && m.rankingPosicao > 0 ? (
                          <span className="absolute -top-2 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-sky-400/40 bg-sky-500/15 px-1 py-[1px] text-[7px] font-black uppercase text-sky-100 eid-light:border-sky-200 eid-light:bg-sky-100 eid-light:text-[#1a2b4c]">
                            #{m.rankingPosicao}
                          </span>
                        ) : null}
                        <ProfileEditDrawerTrigger
                          href={statsHref}
                          title={f ? `Estatísticas da formação ${tituloCard}` : `Estatísticas EID de ${tituloCard}`}
                          fullscreen
                          topMode="backOnly"
                          className="relative block h-full w-full overflow-hidden rounded-full border-[2.5px] border-eid-card bg-eid-field-bg shadow-md ring-1 ring-[color:var(--eid-border-subtle)]"
                        >
                          {avatarPedidoRecebido}
                        </ProfileEditDrawerTrigger>
                      </div>
                      <div className="mt-2 flex justify-center">
                        <ProfileEidPerformanceSeal notaEid={seloEid} compact className="scale-110" />
                      </div>
                      <EidCityState
                        location={localCard?.trim() ? localCard : null}
                        compact
                        align="center"
                        className="mt-1.5 w-full text-eid-text-secondary [&_.font-semibold]:text-eid-fg"
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 w-full flex-col items-center gap-3 px-0.5 pt-0 text-center">
                    <div className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-0.5">
                      <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                        <Calendar className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                        {recebido.date}
                      </p>
                      <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                        <Clock className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                        {recebido.time}
                      </p>
                    </div>
                    <div className="mx-auto flex w-full max-w-[11rem] flex-col items-stretch gap-1.5">
                      <span className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/55 bg-sky-500/12 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] text-eid-fg eid-light:border-sky-200/90 eid-light:bg-sky-100 eid-light:text-[#1a2b4c]">
                        Recebido
                      </span>
                      <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.04em] text-orange-200 eid-light:border-orange-200/90 eid-light:bg-[#fff7ed] eid-light:text-[#9a3412]">
                        <span className="text-orange-300 eid-light:text-[#c2410c]">
                          <SportGlyphIcon sportName={m.esporte} />
                        </span>
                        <span className="truncate normal-case">{m.esporte}</span>
                      </span>
                      {m.timeNome ? (
                        <span className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/55 bg-sky-500/12 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.04em] text-eid-fg eid-light:border-sky-200/90 eid-light:bg-sky-100 eid-light:text-[#1a2b4c]">
                          <span className="truncate">{m.timeNome}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-teal-500/35 bg-teal-500/12 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.05em] text-teal-100 eid-light:border-teal-200/90 eid-light:bg-teal-50 eid-light:text-teal-900">
                        <span className="inline-flex shrink-0 scale-90 text-teal-200 eid-light:text-teal-800">
                          <ModalidadeGlyphIcon modalidade={modalidadeKind} />
                        </span>
                        <span className="truncate">{m.modalidade === "individual" ? "Individual" : m.modalidade}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col items-center px-0.5 text-center">
                    <p className="flex w-full flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-eid-action-600">
                      <span className="shrink-0">Resposta</span>
                    </p>
                    <p className="mt-3 max-w-[11rem] text-[10px] font-medium leading-snug text-eid-text-secondary">
                      Use os botões abaixo para aceitar ou recusar o desafio.
                    </p>
                  </div>
                </div>

                {showStatsHint ? (
                  <p className="px-0.5 pb-2 text-center text-[10px] text-eid-text-secondary">Toque na foto para abrir as estatísticas EID em tela cheia.</p>
                ) : null}
                {m.finalidade === "ranking" && m.rankingPreview ? (
                  <div className="px-0.5 pb-1">
                    <DesafioImpactoResumo
                      esporteNome={m.esporte}
                      regras={m.rankingPreview.regras}
                      individual={m.rankingPreview.kind === "individual" ? m.rankingPreview.perspective : null}
                      coletivo={m.rankingPreview.kind === "coletivo" ? m.rankingPreview.coletivo : null}
                    />
                  </div>
                ) : null}
                <div
                  className={`${EID_SOCIAL_PANEL_ACOES_ROW} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !items-stretch gap-1.5 sm:gap-2`}
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
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
