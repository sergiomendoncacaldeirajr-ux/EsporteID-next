"use client";

import { useActionState, useEffect, useState } from "react";
import { cancelarPedidoMatchPendente, type CancelarPedidoPendenteState } from "@/app/comunidade/actions";
import { iniciaisFormacao } from "@/components/comunidade/comunidade-pedidos-match";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { PEDIDO_DESAFIO_ENVIADO_CANCELAR_BTN_CLASS } from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import Image from "next/image";

type Item = {
  id: number;
  adversarioId: string;
  adversarioNome: string;
  adversarioAvatarUrl?: string | null;
  adversarioLocalizacao?: string | null;
  adversarioNotaEid?: number | null;
  esporte: string;
  esporteId: number;
  modalidade: string;
  /** Alvo dupla/time (pedido coletivo): exibir formação, não o perfil do líder. */
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
      <ul className="space-y-2">
        {items.map((m) => {
          const f = m.formacaoAdversaria;
          const titulo = (f?.nome?.trim() ? f.nome : null) ?? m.adversarioNome;
          const local = (f?.localizacao?.trim() ? f.localizacao : null) ?? m.adversarioLocalizacao;
          /** `formacaoAdversaria.id` é `times.id` (dupla ou time). */
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
          return (
          <li
            key={m.id}
            className="relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-stretch gap-3">
              <div className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60">
                  {statsHref ? (
                    <ProfileEditDrawerTrigger
                      href={statsHref}
                      title={f ? `Estatísticas da formação ${titulo}` : `Estatísticas EID de ${titulo}`}
                      fullscreen
                      topMode="backOnly"
                      className="relative block h-12 w-12 overflow-hidden rounded-full"
                    >
                      {avatarInner}
                    </ProfileEditDrawerTrigger>
                  ) : (
                    avatarInner
                  )}
                </div>
                <ProfileEidPerformanceSeal notaEid={seloEid} compact className="scale-[1.2] sm:scale-125" />
              </div>
              <div className="min-w-0 flex-1 self-start">
                <p className="truncate text-xs font-semibold text-eid-fg">{titulo}</p>
                <p className="text-[10px] text-eid-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <SportGlyphIcon sportName={m.esporte} />
                    <span>{m.esporte}</span>
                  </span>
                  <span className="mx-1 opacity-70">|</span>
                  <span className="inline-flex items-center gap-1">
                    <ModalidadeGlyphIcon
                      modalidade={
                        String(m.modalidade).trim().toLowerCase() === "time"
                          ? "time"
                          : String(m.modalidade).trim().toLowerCase() === "individual"
                            ? "individual"
                            : "dupla"
                      }
                    />
                    <span>{m.modalidade === "individual" ? "individual" : m.modalidade}</span>
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                  {local?.trim() ? local : "Localização não informada"}
                </p>
              </div>
              <div className="flex min-w-0 shrink-0 flex-col items-end justify-between gap-2">
                <span className="rounded-full border border-amber-400/40 bg-amber-500/18 px-1.5 py-[1px] text-[7px] font-extrabold uppercase leading-none text-[color:color-mix(in_srgb,var(--eid-warning-500)_86%,var(--eid-fg)_14%)]">
                  Aguardando
                </span>
                <form action={formAction} className="inline">
                  <input type="hidden" name="match_id" value={String(m.id)} />
                  <button
                    type="button"
                    disabled={pending}
                    className={PEDIDO_DESAFIO_ENVIADO_CANCELAR_BTN_CLASS}
                    data-eid-cancel-pendente-btn="true"
                    onClick={() => setConfirmId(m.id)}
                  >
                    {pending ? "Cancelando..." : "Cancelar"}
                  </button>
                </form>
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
