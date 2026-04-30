"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Send } from "lucide-react";
import { cancelarConviteDaEquipe, type TeamActionState } from "@/app/times/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidAcceptedBadge } from "@/components/ui/eid-accepted-badge";
import { EidRejectedBadge } from "@/components/ui/eid-rejected-badge";
import { EID_INVITE_ACTION_CLASS } from "@/components/ui/eid-invite-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  EID_SOCIAL_CARD_FOOTER,
  EID_SOCIAL_CARD_SHELL,
  EID_SOCIAL_GRID_3,
  getSocialStatusCardShell,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";

export type ConviteTimeEnviadoItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  equipeAvatarUrl?: string | null;
  equipeNotaEid?: number | null;
  equipeLocalizacao?: string | null;
  esporteNome: string;
  convidadoId: string;
  convidadoNome: string;
  convidadoUsername?: string | null;
  convidadoAvatarUrl?: string | null;
  convidadoNotaEid?: number | null;
  convidadoLocalizacao?: string | null;
  convidadoDistanceKm?: number | null;
  status: string;
  criadoEm: string | null;
  respondidoEm: string | null;
};

const cancelInitial: TeamActionState = { ok: false, message: "" };

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "Atleta";
  return clean.split(/\s+/)[0] ?? clean;
}

function statusLabel(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "pendente") return "Pendente";
  if (s === "aceito" || s === "aprovado") return "Aceito";
  if (s === "recusado") return "Recusado";
  if (s === "cancelado") return "Cancelado";
  return "Status desconhecido";
}

function statusClass(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "pendente") {
    return "border-[color:color-mix(in_srgb,var(--eid-warning-500)_48%,var(--eid-border-subtle)_52%)] bg-[color:color-mix(in_srgb,var(--eid-warning-500)_15%,var(--eid-card)_85%)] text-[color:color-mix(in_srgb,var(--eid-warning-500)_86%,var(--eid-fg)_14%)]";
  }
  if (s === "aceito" || s === "aprovado") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-100";
  if (s === "recusado" || s === "cancelado") return "border-rose-500/35 bg-rose-500/12 text-rose-100";
  return "border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200";
}

export function ComunidadeConvitesEnviadosTime({ items }: { items: ConviteTimeEnviadoItem[] }) {
  const router = useRouter();
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelarConviteDaEquipe, cancelInitial);

  useEffect(() => {
    if (cancelState.ok) {
      router.refresh();
    }
  }, [cancelState.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-xl bg-eid-surface/30 p-2.5 text-[11px] text-eid-text-secondary">
        Você ainda não enviou convites de equipe.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {cancelState.message ? (
        <p
          className={`rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs ${
            cancelState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"
          }`}
        >
          {cancelState.message}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((c) => {
          const pendente = String(c.status ?? "").trim().toLowerCase() === "pendente";
          const enviado = formatSolicitacaoParts(c.criadoEm);
          const resp = c.respondidoEm ? formatSolicitacaoParts(c.respondidoEm) : null;
          return (
            <li key={c.id} className={getSocialStatusCardShell(c.status) || EID_SOCIAL_CARD_SHELL}>
              <span className={`${EID_INVITE_ACTION_CLASS} absolute left-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em]`}>
                <Send className="h-3 w-3" aria-hidden />
                Convite
              </span>
              <span className="absolute right-3 top-3 z-[1]">
                {String(c.status ?? "").trim().toLowerCase() === "pendente" ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusClass(c.status)}`}>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      {statusLabel(c.status)}
                    </span>
                  </span>
                ) : String(c.status ?? "").trim().toLowerCase() === "aceito" ||
                  String(c.status ?? "").trim().toLowerCase() === "aprovado" ? (
                  <EidAcceptedBadge label={statusLabel(c.status)} />
                ) : String(c.status ?? "").trim().toLowerCase() === "recusado" ||
                  String(c.status ?? "").trim().toLowerCase() === "cancelado" ? (
                  <EidRejectedBadge label={statusLabel(c.status)} />
                ) : (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusClass(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                )}
              </span>

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                    {/* Coluna — Formação + local */}
                    <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Formação</p>
                      <ProfileEditDrawerTrigger
                        href={`/perfil-time/${c.equipeId}?from=/comunidade`}
                        title={c.equipeNome}
                        fullscreen
                        topMode="backOnly"
                        className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                      >
                        <div className="flex w-full flex-col items-center px-0.5 py-1">
                          <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(c.equipeNome)}</p>
                          <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                            {c.equipeAvatarUrl ? (
                              <Image src={c.equipeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                {(c.equipeNome ?? "T").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <ProfileEidPerformanceSeal notaEid={Number(c.equipeNotaEid ?? 0)} compact className="scale-125" />
                          </div>
                          <EidCityState location={c.equipeLocalizacao} compact align="center" className="mt-1 w-full" />
                        </div>
                      </ProfileEditDrawerTrigger>
                    </div>

                    {/* Coluna — data / hora (+ contexto) */}
                    <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                      <div className="w-full">
                        <p className="text-[11px] tabular-nums text-eid-text-secondary">{enviado.date}</p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{enviado.time}</p>
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Enviado</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <span className="inline-flex items-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-action-200">
                          <span className="inline-flex items-center gap-1">
                            <SportGlyphIcon sportName={c.esporteNome} />
                            <span>{c.esporteNome}</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-primary-200">
                          <ModalidadeGlyphIcon
                            modalidade={
                              String(c.equipeTipo ?? "").trim().toLowerCase() === "dupla"
                                ? "dupla"
                                : String(c.equipeTipo ?? "").trim().toLowerCase() === "time"
                                  ? "time"
                                  : "individual"
                            }
                          />
                          <span>{(c.equipeTipo ?? "time").toUpperCase()}</span>
                        </span>
                      </div>
                      {resp ? (
                        <div className="w-full border-t border-[color:var(--eid-border-subtle)] pt-2">
                          <p className="text-[10px] font-semibold text-eid-text-secondary">Respondido</p>
                          <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.date}</p>
                          <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.time}</p>
                        </div>
                      ) : null}
                    </div>

                    {/* Coluna — Convidado + local */}
                    <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                      <p className="text-right text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Convidado</p>
                      <ProfileEditDrawerTrigger
                        href={`/perfil/${c.convidadoId}?from=/comunidade`}
                        title={c.convidadoNome}
                        fullscreen
                        topMode="backOnly"
                        className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                      >
                        <div className="flex w-full flex-col items-center px-0.5 py-1">
                          <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(c.convidadoNome)}</p>
                          <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                            {c.convidadoAvatarUrl ? (
                              <Image src={c.convidadoAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                {(c.convidadoNome ?? "A").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <ProfileEidPerformanceSeal notaEid={Number(c.convidadoNotaEid ?? 0)} compact className="scale-125" />
                          </div>
                          <EidCityState location={c.convidadoLocalizacao} compact align="center" className="mt-1 w-full" />
                        </div>
                      </ProfileEditDrawerTrigger>
                    </div>
                  </div>

              {pendente ? (
                <div className={EID_SOCIAL_CARD_FOOTER}>
                  <form action={cancelAction} className="flex w-full justify-start">
                    <input type="hidden" name="time_id" value={c.equipeId} />
                    <input type="hidden" name="convite_id" value={c.id} />
                    <EidCancelButton
                      type="submit"
                      compact
                      loading={cancelPending}
                      label="Cancelar convite"
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
