"use client";

import { useActionState, useEffect, useState } from "react";
import { cancelarPedidoMatchPendente, type CancelarPedidoPendenteState } from "@/app/comunidade/actions";
import { iniciaisFormacao } from "@/components/comunidade/comunidade-pedidos-match";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_PANEL_FOOTER,
  EID_SOCIAL_PANEL_ITEM_NEUTRAL,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import Image from "next/image";

type Item = {
  id: number;
  solicitadoEm?: string | null;
  adversarioId: string;
  adversarioNome: string;
  adversarioAvatarUrl?: string | null;
  adversarioLocalizacao?: string | null;
  adversarioNotaEid?: number | null;
  esporte: string;
  esporteId: number;
  modalidade: string;
  formacaoAdversaria?: {
    id: number;
    nome: string | null;
    escudo: string | null;
    localizacao: string | null;
    tipo: "dupla" | "time";
    eidTime: number;
  } | null;
};

const initial: CancelarPedidoPendenteState = { ok: false, message: "" };

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "Atleta";
  return clean.split(/\s+/)[0] ?? clean;
}

export function ComunidadePedidosEnviados({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState(cancelarPedidoMatchPendente, initial);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (state.ok) {
      setConfirmId(null);
      window.location.reload();
    }
  }, [state.ok]);

  if (items.length === 0) {
    return <p className="mt-2 text-xs text-eid-text-secondary">Sem pedidos enviados aguardando resposta.</p>;
  }

  const err = !state.ok && "message" in state && state.message ? state.message : null;

  return (
    <div className="mt-2 space-y-2">
      {err ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}
      <ul className="space-y-3">
        {items.map((m) => {
          const f = m.formacaoAdversaria;
          const titulo = (f?.nome?.trim() ? f.nome : null) ?? m.adversarioNome;
          const local = (f?.localizacao?.trim() ? f.localizacao : null) ?? m.adversarioLocalizacao;
          const statsHref =
            f && m.esporteId > 0
              ? `/perfil-time/${f.id}/eid/${m.esporteId}?from=${encodeURIComponent("/comunidade")}`
              : m.adversarioId && m.esporteId > 0
                ? `/perfil/${m.adversarioId}/eid/${m.esporteId}?from=${encodeURIComponent("/comunidade")}`
                : null;
          const seloEid = f ? f.eidTime : Number(m.adversarioNotaEid ?? 0);
          const avatarInner =
            f?.escudo?.trim() ? (
              <Image src={f.escudo.trim()} alt="" fill unoptimized className="object-cover object-center" />
            ) : f ? (
              <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-eid-primary-300">
                {iniciaisFormacao(f.nome)}
              </div>
            ) : m.adversarioAvatarUrl ? (
              <Image src={m.adversarioAvatarUrl} alt="" fill unoptimized className="object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-eid-primary-300">EID</div>
            );
          const quando = formatSolicitacaoParts(m.solicitadoEm);
          const adversarioBlock = (
            <div className="flex w-full flex-col items-center px-0.5 py-1">
              <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(titulo)}</p>
              <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                {statsHref ? (
                  <ProfileEditDrawerTrigger
                    href={statsHref}
                    title={f ? `Estatísticas da formação ${titulo}` : `Estatísticas EID de ${titulo}`}
                    fullscreen
                    topMode="backOnly"
                    className="relative block h-full w-full"
                  >
                    {avatarInner}
                  </ProfileEditDrawerTrigger>
                ) : (
                  avatarInner
                )}
              </div>
              <div className="mt-0.5">
                <ProfileEidPerformanceSeal notaEid={seloEid} compact className="scale-[1.2] sm:scale-125" />
              </div>
              <EidCityState location={local?.trim() ? local : null} compact align="center" className="mt-1 w-full" />
            </div>
          );
          return (
            <li key={m.id} className={EID_SOCIAL_PANEL_ITEM_NEUTRAL}>
              <span className="absolute right-3 top-3 z-[1]">
                <EidPendingBadge label="Pendente" compact />
              </span>

              <div className={`${EID_SOCIAL_GRID_3} pt-11`}>
                <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Adversário</p>
                  <div className="mt-1 rounded-lg border border-transparent">{adversarioBlock}</div>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-3 pt-1 text-center sm:px-3">
                  <div className="w-full">
                    <p className="text-[11px] tabular-nums text-eid-text-secondary">{quando.date}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{quando.time}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Solicitado</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <span className="inline-flex items-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-action-200">
                      <span className="inline-flex items-center gap-1">
                        <SportGlyphIcon sportName={m.esporte} />
                        <span>{m.esporte}</span>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-primary-200">
                      <ModalidadeGlyphIcon
                        modalidade={
                          String(m.modalidade).trim().toLowerCase() === "time"
                            ? "time"
                            : String(m.modalidade).trim().toLowerCase() === "individual"
                              ? "individual"
                              : "dupla"
                        }
                      />
                      <span>{m.modalidade === "individual" ? "INDIVIDUAL" : String(m.modalidade).toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col items-center justify-start px-2 pb-3 pt-1 text-center sm:px-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">Situação</p>
                  <p className="mt-3 max-w-[7.5rem] text-[10px] font-semibold leading-snug text-eid-text-secondary">
                    Aguardando resposta do adversário
                  </p>
                </div>
              </div>

              <div className={EID_SOCIAL_PANEL_FOOTER}>
                <div className="flex w-full justify-start">
                  <EidCancelButton
                    type="button"
                    compact
                    loading={pending}
                    label="Cancelar pedido"
                    onClick={() => setConfirmId(m.id)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {confirmId ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-0 shadow-xl">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Confirmação</p>
              <span className="rounded-full border border-red-400/35 bg-red-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-red-200">
                Cancelar pedido
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-eid-primary-300">Confirmar cancelamento</p>
              <p className="mt-2 text-sm text-eid-text-secondary">Tem certeza que deseja cancelar este pedido de desafio?</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 text-xs font-bold text-eid-fg"
                  onClick={() => setConfirmId(null)}
                >
                  Voltar
                </button>
                <form action={formAction} className="flex-1">
                  <input type="hidden" name="match_id" value={String(confirmId)} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[32px] w-full items-center justify-center rounded-lg border border-red-700 bg-red-700 px-3 text-xs font-black text-white"
                  >
                    Confirmar cancelamento
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
