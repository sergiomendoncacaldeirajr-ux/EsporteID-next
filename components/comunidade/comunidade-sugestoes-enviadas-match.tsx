"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  limparSugestaoEnviadaNotificacao,
  type LimparSugestaoEnviadaState,
} from "@/app/comunidade/actions";
import { createClient } from "@/lib/supabase/client";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidLimparCompactButton } from "@/components/ui/eid-limpar-compact-button";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  EID_SOCIAL_CARD_FOOTER,
  EID_SOCIAL_GRID_3,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import { EidAcceptedBadge } from "@/components/ui/eid-accepted-badge";
import { EidRejectedBadge } from "@/components/ui/eid-rejected-badge";
import { EidCityState } from "@/components/ui/eid-city-state";

export type SugestaoEnviadaMatchItem = {
  id: number;
  statusRaw: string;
  statusLabel: string;
  statusClass: string;
  criadoEm: string;
  respondidoEm?: string | null;
  sugeridorId: string;
  sugeridorNome: string;
  sugeridorAvatarUrl?: string | null;
  meuTimeId?: number | null;
  meuTimeTipo?: string | null;
  meuTimeNome: string;
  meuTimeAvatarUrl?: string | null;
  meuTimeNotaEid?: number | null;
  meuTimeLocalizacao?: string | null;
  alvoTimeNome: string;
  alvoLocalizacao?: string | null;
  esporte: string;
  modalidade: string;
  mensagem: string | null;
};

const initial: LimparSugestaoEnviadaState = { ok: false, message: "" };

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] ?? clean;
}

const sugestaoEnviadaShell =
  "relative overflow-hidden rounded-xl border border-amber-500/25 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-warning-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] text-sm shadow-[0_8px_18px_-14px_rgba(217,119,6,0.45)] md:p-0";

export function ComunidadeSugestoesEnviadasMatch({
  items,
  viewerUserId,
}: {
  items: SugestaoEnviadaMatchItem[];
  viewerUserId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(limparSugestaoEnviadaNotificacao, initial);
  const [clickedClearId, setClickedClearId] = useState<number | null>(null);
  const err = "ok" in state && !state.ok ? state.message : null;

  useEffect(() => {
    if (!viewerUserId) return;
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), 500);
    };
    const ch = supabase
      .channel(`eid-comunidade-sugestoes-enviadas-${viewerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_sugestoes",
          filter: `sugeridor_id=eq.${viewerUserId}`,
        },
        scheduleRefresh
      )
      .subscribe();
    return () => {
      if (debounce) clearTimeout(debounce);
      void supabase.removeChannel(ch);
    };
  }, [viewerUserId, router]);

  useEffect(() => {
    if ("ok" in state && state.ok) {
      setClickedClearId(null);
      router.refresh();
    }
  }, [state, router]);

  function formacaoHref(item: SugestaoEnviadaMatchItem): string {
    return `/perfil-time/${item.meuTimeId}?from=/comunidade`;
  }

  if (!items.length) {
    return (
      <p className="mt-2 rounded-xl bg-eid-surface/30 p-2.5 text-[11px] text-eid-text-secondary">
        Você ainda não enviou sugestão de desafio para liderança.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {err ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}
      <ul className="space-y-3">
        {items.map((s) => {
          const criado = formatSolicitacaoParts(s.criadoEm);
          const resp = s.respondidoEm ? formatSolicitacaoParts(s.respondidoEm) : null;
          return (
            <li key={s.id} className={sugestaoEnviadaShell}>
              {String(s.statusLabel).toLowerCase() === "aprovado" || String(s.statusLabel).toLowerCase() === "aceito" ? (
                <EidAcceptedBadge label={s.statusLabel} compact className="absolute right-3 top-3 z-[1]" />
              ) : String(s.statusLabel).toLowerCase() === "recusado" ? (
                <EidRejectedBadge label={s.statusLabel} compact className="absolute right-3 top-3 z-[1]" />
              ) : (
                <span
                  className={`absolute right-3 top-3 z-[1] rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] ${s.statusClass}`}
                >
                  {s.statusLabel}
                </span>
              )}

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Sua formação</p>
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
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                  <div className="w-full">
                    <p className="text-[11px] tabular-nums text-eid-text-secondary">{criado.date}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{criado.time}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Enviada</p>
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
                  {resp ? (
                    <div className="w-full border-t border-[color:var(--eid-border-subtle)] pt-2">
                      <p className="text-[10px] font-semibold text-eid-text-secondary">Atualizado</p>
                      <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.date}</p>
                      <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.time}</p>
                    </div>
                  ) : null}
                  {s.mensagem ? (
                    <p className="w-full rounded-lg bg-eid-surface/35 px-2 py-1.5 text-[10px] text-eid-fg">
                      “{s.mensagem}”
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-right text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Alvo</p>
                  <div className="mt-1 flex w-full flex-col items-center px-0.5 py-1">
                    <p className="line-clamp-2 text-center text-[10px] font-black leading-tight text-eid-fg">{s.alvoTimeNome}</p>
                    <EidCityState location={s.alvoLocalizacao} compact align="center" className="mt-2 w-full" />
                  </div>
                </div>
              </div>

              <p className="border-t border-amber-500/15 px-3 py-2 text-[10px] text-eid-text-secondary md:px-4">
                {s.statusRaw === "aprovado" ? "Confira também na Agenda." : null}
              </p>

              {s.statusRaw !== "pendente" ? (
                <div className={EID_SOCIAL_CARD_FOOTER}>
                  <form action={formAction}>
                    <input type="hidden" name="sugestao_id" value={String(s.id)} />
                    <EidLimparCompactButton
                      type="submit"
                      pending={pending}
                      busy={pending && clickedClearId === s.id}
                      onClick={() => setClickedClearId(s.id)}
                    />
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
