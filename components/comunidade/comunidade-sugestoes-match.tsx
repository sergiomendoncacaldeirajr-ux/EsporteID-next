"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { responderSugestaoMatch, type ResponderSugestaoMatchState } from "@/app/comunidade/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_PANEL_FOOTER,
  EID_SOCIAL_PANEL_ITEM_AMBER,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { EidCityState } from "@/components/ui/eid-city-state";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
} from "@/lib/desafio/flow-ui";

export type SugestaoMatchItem = {
  id: number;
  criadoEm?: string | null;
  sugeridorId?: string | null;
  sugeridorNome: string;
  sugeridorAvatarUrl?: string | null;
  sugeridorLocalizacao?: string | null;
  meuTimeId?: number | null;
  meuTimeTipo?: string | null;
  meuTimeNome: string;
  meuTimeAvatarUrl?: string | null;
  meuTimeNotaEid?: number | null;
  meuTimeLocalizacao?: string | null;
  alvoTimeNome: string;
  esporte: string;
  modalidade: string;
  mensagem: string | null;
};

const initial: ResponderSugestaoMatchState = { ok: false, message: "" };

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] ?? clean;
}

function formacaoHref(item: SugestaoMatchItem): string {
  return `/perfil-time/${item.meuTimeId}?from=/comunidade`;
}

const sugestaoCardShell =
  "relative overflow-hidden rounded-xl border border-transparent bg-[color:color-mix(in_srgb,var(--eid-warning-500)_9%,var(--eid-card)_91%)] text-sm shadow-[0_8px_18px_-14px_rgba(217,119,6,0.45)]";

export function ComunidadeSugestoesMatch({ items }: { items: SugestaoMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderSugestaoMatch, initial);
  const [clickedAction, setClickedAction] = useState<{ sugestaoId: number; aceitar: boolean } | null>(null);
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
        Nenhuma sugestão de desafio da equipe. Atletas que não são líderes podem sugerir pelo perfil da formação adversária.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {okMsg ? (
        <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
      ) : null}
      {err ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}

      <ul className="space-y-3">
        {items.map((s) => {
          const criado = formatSolicitacaoParts(s.criadoEm);
          return (
            <li key={s.id} className={EID_SOCIAL_PANEL_ITEM_AMBER}>
              <EidPendingBadge label="Pendente" compact className="absolute right-3 top-3 z-[1]" />

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Sugestão do membro</p>
                  {s.meuTimeId ? (
                    <ProfileEditDrawerTrigger
                      href={formacaoHref(s)}
                      title={s.meuTimeNome}
                      fullscreen
                      topMode="backOnly"
                      className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                    >
                      <div className="flex w-full flex-col items-center px-0.5 py-1">
                        <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.meuTimeNome)}</p>
                        <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                          {s.meuTimeAvatarUrl ? (
                            <Image src={s.meuTimeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                              {(s.meuTimeNome ?? "F").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <ProfileEidPerformanceSeal notaEid={Number(s.meuTimeNotaEid ?? 0)} compact className="scale-125" />
                        </div>
                        <EidCityState location={s.meuTimeLocalizacao} compact align="center" className="mt-1 w-full" />
                      </div>
                    </ProfileEditDrawerTrigger>
                  ) : (
                    <div className="mt-1 flex w-full flex-col items-center px-0.5 py-1">
                      <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.meuTimeNome)}</p>
                      <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                        {s.meuTimeAvatarUrl ? (
                          <Image src={s.meuTimeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                            {(s.meuTimeNome ?? "F").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <ProfileEidPerformanceSeal notaEid={Number(s.meuTimeNotaEid ?? 0)} compact className="scale-125" />
                      </div>
                      <EidCityState location={s.meuTimeLocalizacao} compact align="center" className="mt-1 w-full" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                  <div className="w-full">
                    <p className="text-[11px] tabular-nums text-eid-text-secondary">{criado.date}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{criado.time}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Registrada</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-primary-200">
                      <ModalidadeGlyphIcon
                        modalidade={
                          String(s.modalidade).toLowerCase() === "dupla" ? "dupla" : String(s.modalidade).toLowerCase() === "time" ? "time" : "individual"
                        }
                      />
                      <span className="truncate">{s.modalidade}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-action-200">
                      <SportGlyphIcon sportName={s.esporte} />
                      <span className="truncate">{s.esporte}</span>
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-eid-text-secondary">
                    Alvo: <span className="text-eid-fg">{s.alvoTimeNome}</span>
                  </p>
                  {s.mensagem ? (
                    <p className="w-full rounded-lg bg-eid-surface/35 px-2 py-1.5 text-[10px] text-eid-fg">
                      “{s.mensagem}”
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-right text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Sugerido por</p>
                  {s.sugeridorId ? (
                    <ProfileEditDrawerTrigger
                      href={`/perfil/${s.sugeridorId}?from=/comunidade`}
                      title={s.sugeridorNome}
                      fullscreen
                      topMode="backOnly"
                      className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                    >
                      <div className="flex w-full flex-col items-center px-0.5 py-1">
                        <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.sugeridorNome)}</p>
                        <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                          {s.sugeridorAvatarUrl ? (
                            <Image src={s.sugeridorAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                              {(s.sugeridorNome ?? "A").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <EidCityState location={s.sugeridorLocalizacao} compact align="center" className="mt-2 w-full" />
                      </div>
                    </ProfileEditDrawerTrigger>
                  ) : (
                    <div className="mt-1 flex w-full flex-col items-center px-0.5 py-1">
                      <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.sugeridorNome)}</p>
                      <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                        {s.sugeridorAvatarUrl ? (
                          <Image src={s.sugeridorAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                            {(s.sugeridorNome ?? "A").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <EidCityState location={s.sugeridorLocalizacao} compact align="center" className="mt-2 w-full" />
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`${EID_SOCIAL_PANEL_FOOTER} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS}`}
              >
                <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                  <input type="hidden" name="sugestao_id" value={String(s.id)} />
                  <input type="hidden" name="aceitar" value="true" />
                  <EidSocialAceitarButton
                    pending={pending}
                    busy={pending && clickedAction?.sugestaoId === s.id && clickedAction.aceitar}
                    actionLabel="aprovar"
                    onClick={() => setClickedAction({ sugestaoId: s.id, aceitar: true })}
                  />
                </form>
                <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                  <input type="hidden" name="sugestao_id" value={String(s.id)} />
                  <input type="hidden" name="aceitar" value="false" />
                  <EidSocialRecusarButton
                    pending={pending}
                    busy={pending && clickedAction?.sugestaoId === s.id && !clickedAction.aceitar}
                    onClick={() => setClickedAction({ sugestaoId: s.id, aceitar: false })}
                  />
                </form>
              </div>
              <p className="border-t border-amber-500/15 px-3 py-2 text-[10px] text-eid-text-secondary md:px-4">
                Ao aprovar, o sistema registra o desafio como <strong className="text-eid-fg">confirmado</strong> e notifica todos os
                membros ativos das duas formações.
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
