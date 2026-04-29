"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { responderConviteEquipe, type ResponderConviteState } from "@/app/comunidade/actions";
import Image from "next/image";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { EID_SOCIAL_CARD_FOOTER } from "@/lib/comunidade/social-panel-layout";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
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
        {items.map((c) => (
          <li
            key={c.id}
            className="overflow-hidden rounded-xl border border-transparent bg-[color:color-mix(in_srgb,var(--eid-card)_92%,var(--eid-surface)_8%)] shadow-[0_8px_18px_-14px_rgba(15,23,42,0.28)]"
          >
            <div className="p-3">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 sm:gap-4">
                <ProfileEditDrawerTrigger
                  href={`/perfil-time/${c.equipeId}?from=/comunidade`}
                  title={c.equipeNome}
                  fullscreen
                  topMode="backOnly"
                  className="-ml-2 block justify-self-start rounded-xl border border-transparent transition hover:border-eid-primary-500/35 sm:-ml-1.5"
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
                        className="scale-125"
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
                    <EidPendingBadge label="Pendente" />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${EID_SOCIAL_CARD_FOOTER} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !mt-0`}>
              <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <EidSocialAceitarButton
                  pending={pending}
                  busy={pending && clickedAction?.conviteId === c.id && clickedAction.aceitar}
                  onClick={() => setClickedAction({ conviteId: c.id, aceitar: true })}
                />
              </form>
              <form action={formAction} className={PEDIDO_MATCH_RECEBIDO_FORM_CLASS}>
                <input type="hidden" name="convite_id" value={String(c.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <EidSocialRecusarButton
                  pending={pending}
                  busy={pending && clickedAction?.conviteId === c.id && !clickedAction.aceitar}
                  onClick={() => setClickedAction({ conviteId: c.id, aceitar: false })}
                />
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
