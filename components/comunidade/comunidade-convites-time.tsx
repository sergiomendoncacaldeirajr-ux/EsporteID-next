"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { responderConviteEquipe, type ResponderConviteState } from "@/app/comunidade/actions";
import Image from "next/image";
import { Calendar, Clock, Shield, User } from "lucide-react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import {
  EID_SOCIAL_CARD_FOOTER,
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_SUGESTAO_ENVIADA_CARD_SHELL,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
} from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

export type ConviteTimeItem = {
  id: number;
  equipeNome: string;
  equipePrimeiroNome: string;
  equipeId: number;
  equipeTipo: string;
  equipeAvatarUrl?: string | null;
  equipeNotaEid?: number | null;
  equipeLocalizacao?: string | null;
  equipeDistanceKm?: number | null;
  esporteNome: string;
  /** Nome amigável do convidante (legado / fallback). */
  convidadoPor: string;
  criadoEm: string;
  convidanteId: string;
  convidanteNome: string;
  convidantePrimeiroNome: string;
  convidanteUsername: string | null;
  convidanteAvatarUrl: string | null;
  convidanteLocalizacao?: string | null;
};

const initial: ResponderConviteState = { ok: false, message: "" };

export function ComunidadeConvitesTime({ items }: { items: ConviteTimeItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderConviteEquipe, initial);
  const [clickedAction, setClickedAction] = useState<{ conviteId: number; aceitar: boolean } | null>(null);

  useEffect(() => {
    if (state.ok) {
      setClickedAction(null);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-xl bg-eid-surface/30 p-2.5 text-[11px] text-eid-text-secondary">
        Nenhum convite de equipe no momento.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {!state.ok && state.message ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{state.message}</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((c) => {
          const criado = formatSolicitacaoParts(c.criadoEm);
          const isDupla = String(c.equipeTipo ?? "")
            .trim()
            .toLowerCase() === "dupla";
          const formacaoHref = `/perfil-time/${c.equipeId}?from=/comunidade`;
          return (
            <li key={c.id} className={EID_SOCIAL_SUGESTAO_ENVIADA_CARD_SHELL}>
              <EidPendingBadge label="Pendente" compact className="absolute right-3 top-3 z-[1]" />

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">
                    <Shield className="h-3 w-3 shrink-0 text-amber-200/90" aria-hidden />
                    Formação
                  </p>
                  <ProfileEditDrawerTrigger
                    href={formacaoHref}
                    title={c.equipeNome}
                    fullscreen
                    topMode="backOnly"
                    className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                  >
                    <div className="flex w-full flex-col gap-2 px-0.5 py-1">
                      <div className="flex w-full items-start gap-2.5">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                          {c.equipeAvatarUrl ? (
                            <Image src={c.equipeAvatarUrl} alt="" fill unoptimized className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                              {(c.equipeNome ?? "T").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5 text-left">
                          <p className="truncate text-[11px] font-black text-eid-fg">{c.equipePrimeiroNome}</p>
                          <p className="mt-0.5 truncate text-[9px] text-eid-text-secondary">
                            {isDupla ? "Dupla" : "Time"} · {c.esporteNome}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center sm:justify-start">
                        <ProfileEidPerformanceSeal notaEid={Number(c.equipeNotaEid ?? 0)} compact className="scale-125" />
                      </div>
                      <EidCityState
                        location={c.equipeLocalizacao}
                        compact
                        align="start"
                        className="w-full"
                      />
                    </div>
                  </ProfileEditDrawerTrigger>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                  <div className="flex w-full flex-col items-center gap-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] tabular-nums text-eid-text-secondary">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-eid-primary-400" aria-hidden />
                      {criado.date}
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-[11px] tabular-nums text-eid-text-secondary">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-eid-primary-400" aria-hidden />
                      {criado.time}
                    </p>
                  </div>
                  <div className="flex w-full max-w-[11rem] flex-col items-stretch gap-1.5">
                    <span className="inline-flex w-full items-center justify-center rounded-full border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-sky-200">
                      Convite
                    </span>
                    <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-1 text-[9px] font-semibold leading-none text-eid-primary-200">
                      <ModalidadeGlyphIcon modalidade={isDupla ? "dupla" : "time"} />
                      <span className="truncate">{isDupla ? "Dupla" : "Time"}</span>
                    </span>
                    <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-1 text-[9px] font-semibold leading-none text-eid-action-200">
                      <SportGlyphIcon sportName={c.esporteNome} />
                      <span className="truncate">{c.esporteNome}</span>
                    </span>
                  </div>
                  <p className="text-[10px] leading-snug text-eid-text-secondary">
                    Convite para integrar{" "}
                    <span className="font-semibold text-eid-fg">{c.equipeNome}</span>
                  </p>
                </div>

                <div className="flex min-w-0 flex-col items-end px-2 pb-3 pt-1 sm:px-3">
                  <p className="flex w-full items-center justify-end gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">
                    <User className="h-3 w-3 shrink-0 text-amber-200/90" aria-hidden />
                    Convidante
                  </p>
                  <ProfileEditDrawerTrigger
                    href={`/perfil/${c.convidanteId}?from=/comunidade`}
                    title={c.convidanteNome}
                    fullscreen
                    topMode="backOnly"
                    className="mt-1 block w-fit max-w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                  >
                    <div className="flex w-full flex-col items-end gap-2 px-0.5 py-1">
                      <div className="flex w-full items-start justify-end gap-2.5">
                        <div className="min-w-0 flex-1 pt-0.5 text-right">
                          <p className="truncate text-[11px] font-black text-eid-fg">{c.convidantePrimeiroNome}</p>
                          {c.convidanteUsername ? (
                            <p className="mt-0.5 truncate text-[9px] font-semibold text-eid-primary-300">
                              {c.convidanteUsername}
                            </p>
                          ) : null}
                        </div>
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                          {c.convidanteAvatarUrl ? (
                            <Image src={c.convidanteAvatarUrl} alt="" fill unoptimized className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                              {(c.convidanteNome ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <EidCityState
                        location={c.convidanteLocalizacao}
                        compact
                        align="end"
                        className="w-full max-w-[10rem]"
                      />
                    </div>
                  </ProfileEditDrawerTrigger>
                </div>
              </div>

              <div
                className={`${EID_SOCIAL_CARD_FOOTER} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !items-stretch gap-2 border-amber-500/20 !bg-[color:color-mix(in_srgb,var(--eid-warning-500)_8%,var(--eid-surface)_92%)] sm:gap-3`}
              >
                <form action={formAction} className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
                  <input type="hidden" name="convite_id" value={String(c.id)} />
                  <input type="hidden" name="aceitar" value="true" />
                  <EidSocialAceitarButton
                    pending={pending}
                    busy={pending && clickedAction?.conviteId === c.id && clickedAction.aceitar}
                    onClick={() => setClickedAction({ conviteId: c.id, aceitar: true })}
                    className="min-h-[44px] w-full rounded-xl text-[10px] sm:min-h-[48px] sm:text-[11px]"
                  />
                </form>
                <form action={formAction} className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
                  <input type="hidden" name="convite_id" value={String(c.id)} />
                  <input type="hidden" name="aceitar" value="false" />
                  <EidSocialRecusarButton
                    pending={pending}
                    busy={pending && clickedAction?.conviteId === c.id && !clickedAction.aceitar}
                    onClick={() => setClickedAction({ conviteId: c.id, aceitar: false })}
                    className="min-h-[44px] w-full rounded-xl text-[10px] sm:min-h-[48px] sm:text-[11px]"
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
