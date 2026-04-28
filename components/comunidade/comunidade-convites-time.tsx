"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { responderConviteEquipe, type ResponderConviteState } from "@/app/comunidade/actions";
import Image from "next/image";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import {
  PEDIDO_ACEITAR_BTN_CLASS,
  PEDIDO_ACOES_ROW_CLASS,
  PEDIDO_ACAO_FORM_INLINE_CLASS,
  PEDIDO_RECUSAR_BTN_CLASS,
} from "@/lib/desafio/flow-ui";

export type ConviteTimeItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  equipeAvatarUrl?: string | null;
  equipeNotaEid?: number | null;
  equipeLocalizacao?: string | null;
  equipeDistanceKm?: number | null;
  esporteNome: string;
  convidadoPor: string;
};

const initial: ResponderConviteState = { ok: false, message: "" };

export function ComunidadeConvitesTime({ items }: { items: ConviteTimeItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderConviteEquipe, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
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
        {items.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-start gap-3">
              <ProfileEditDrawerTrigger
                href={`/perfil-time/${c.equipeId}?from=/comunidade`}
                title={c.equipeNome}
                fullscreen
                topMode="backOnly"
                className="block rounded-xl border border-transparent transition hover:border-eid-primary-500/35"
              >
                <div className="flex w-[72px] flex-col items-center">
                  <p className="mb-1 max-w-[72px] truncate text-center text-[11px] font-black text-eid-fg">
                    {(c.equipeTipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time"}
                  </p>
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-eid-primary-500/30 bg-eid-surface">
                    {c.equipeAvatarUrl ? (
                      <Image src={c.equipeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                        {(c.equipeNome ?? "T").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="mt-1">
                    <ProfileEidPerformanceSeal
                      notaEid={Number(c.equipeNotaEid ?? 0)}
                      compact
                      locationLabel={c.equipeLocalizacao}
                      distanceKm={c.equipeDistanceKm}
                    />
                  </div>
                </div>
              </ProfileEditDrawerTrigger>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-eid-fg">{c.equipeNome}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {(c.equipeTipo ?? "time").toUpperCase()} · {c.esporteNome} · convite de {c.convidadoPor}
                    </p>
                  </div>
                  <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-200">
                    Convite pendente
                  </span>
                </div>
                <div className={PEDIDO_ACOES_ROW_CLASS}>
                  <form action={formAction} className={PEDIDO_ACAO_FORM_INLINE_CLASS}>
                    <input type="hidden" name="convite_id" value={String(c.id)} />
                    <input type="hidden" name="aceitar" value="true" />
                    <button type="submit" disabled={pending} className={PEDIDO_ACEITAR_BTN_CLASS}>
                      <span>{pending ? "Salvando…" : "Aceitar"}</span>
                    </button>
                  </form>
                  <form action={formAction} className={PEDIDO_ACAO_FORM_INLINE_CLASS}>
                    <input type="hidden" name="convite_id" value={String(c.id)} />
                    <input type="hidden" name="aceitar" value="false" />
                    <button type="submit" disabled={pending} className={PEDIDO_RECUSAR_BTN_CLASS}>
                      Recusar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
