"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { responderConviteEquipe } from "@/app/comunidade/actions";
import Image from "next/image";
import { Calendar, Clock, Shield, User } from "lucide-react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import {
  EID_SOCIAL_PANEL_FOOTER,
  EID_SOCIAL_PANEL_ITEM_AMBER,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import {
  PEDIDO_MATCH_RECEBIDO_FORM_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS,
} from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

/** Três colunas iguais, largura total do card — conteúdo centralizado em cada faixa. */
const CONVITE_TIME_GRID =
  "grid w-full min-w-0 grid-cols-3 justify-items-stretch gap-x-2 sm:gap-x-4 md:gap-x-5";

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
  criadoEm: string;
  /** Perfil de quem enviou o convite (`convidado_por_usuario_id`). */
  convidadoPorUsuarioId: string;
  convidadoPorNome: string;
  convidadoPorPrimeiroNome: string;
  convidadoPorUsername: string | null;
  convidadoPorAvatarUrl: string | null;
  convidadoPorLocalizacao?: string | null;
};

type PendingAcao = "aceitar" | "recusar" | null;

function ConviteTimeRow({ c }: { c: ConviteTimeItem }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAcao>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function enviar(aceitar: boolean) {
    if (pending) return;
    const acao: PendingAcao = aceitar ? "aceitar" : "recusar";
    setPending(acao);
    setRowError(null);
    try {
      const fd = new FormData();
      fd.set("convite_id", String(c.id));
      fd.set("aceitar", aceitar ? "true" : "false");
      const res = await responderConviteEquipe(undefined, fd);
      if (!res.ok) {
        setRowError(res.message);
        return;
      }
      router.refresh();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Não foi possível concluir. Tente de novo.");
    } finally {
      setPending(null);
    }
  }

  const criado = formatSolicitacaoParts(c.criadoEm);
  const isDupla = String(c.equipeTipo ?? "")
    .trim()
    .toLowerCase() === "dupla";
  const formacaoHref = `/perfil-time/${c.equipeId}?from=/comunidade`;

  return (
    <li className={`${EID_SOCIAL_PANEL_ITEM_AMBER} w-full min-w-0`}>
      <div className={`${CONVITE_TIME_GRID} pt-2`}>
        <div className="flex min-w-0 w-full flex-col items-center px-1.5 pb-3 pt-0 sm:px-2">
          <p className="flex w-full min-w-0 items-center justify-start gap-1 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">
            <Shield className="h-3 w-3 shrink-0 text-amber-200/90" aria-hidden />
            Formação
          </p>
          <ProfileEditDrawerTrigger
            href={formacaoHref}
            title={c.equipeNome}
            fullscreen
            topMode="backOnly"
            className="mt-0.5 block w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
          >
            <div className="flex w-full flex-col items-center gap-1.5 px-0.5 pb-0 pt-0">
              <div className="flex w-full flex-col items-center gap-1.5">
                <div className="min-w-0 w-full text-center">
                  <p className="truncate text-[11px] font-black text-eid-fg">{c.equipePrimeiroNome}</p>
                </div>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                  {c.equipeAvatarUrl ? (
                    <Image src={c.equipeAvatarUrl} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                      {(c.equipeNome ?? "T").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex w-full justify-center">
                  <ProfileEidPerformanceSeal
                    notaEid={Number(c.equipeNotaEid ?? 0)}
                    compact
                    className="origin-center scale-[1.42]"
                  />
                </div>
              </div>
              <EidCityState location={c.equipeLocalizacao} compact align="center" className="w-full" />
            </div>
          </ProfileEditDrawerTrigger>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-2 px-1.5 pb-3 pt-0 text-center sm:px-2.5">
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
          <div className="flex w-full min-w-0 flex-col items-stretch gap-1.5">
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
          <p className="w-full text-center text-[10px] leading-snug text-eid-text-secondary">
            Convite para integrar <span className="font-semibold text-eid-fg">{c.equipeNome}</span>
          </p>
        </div>

        <div className="flex min-w-0 w-full flex-col items-center px-1.5 pb-3 pt-0 sm:px-2">
          <p className="flex w-full min-w-0 items-center justify-end gap-1 whitespace-nowrap px-0.5 text-[9px] font-black uppercase leading-none tracking-[0.05em] text-amber-200/90 sm:text-[10px] sm:tracking-[0.07em]">
            <User className="h-3 w-3 shrink-0 text-amber-200/90" aria-hidden />
            Convidado por
          </p>
          <ProfileEditDrawerTrigger
            href={`/perfil/${c.convidadoPorUsuarioId}?from=/comunidade`}
            title={c.convidadoPorNome}
            fullscreen
            topMode="backOnly"
            className="mt-0.5 block w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
          >
            <div className="flex w-full flex-col items-center gap-1.5 px-0.5 pb-0 pt-0">
              <div className="min-w-0 w-full text-center">
                <p className="truncate text-[11px] font-black text-eid-fg">{c.convidadoPorPrimeiroNome}</p>
              </div>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                {c.convidadoPorAvatarUrl ? (
                  <Image src={c.convidadoPorAvatarUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                    {(c.convidadoPorNome ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <EidCityState
                location={c.convidadoPorLocalizacao}
                compact
                align="center"
                className="w-full min-w-0"
              />
            </div>
          </ProfileEditDrawerTrigger>
        </div>
      </div>

      <div
        className={`${EID_SOCIAL_PANEL_FOOTER} ${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !items-stretch gap-2 sm:gap-3`}
      >
        <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
          <EidSocialAceitarButton
            type="button"
            pending={pending !== null}
            busy={pending === "aceitar"}
            onClick={() => void enviar(true)}
            className="w-full"
          />
        </div>
        <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
          <EidSocialRecusarButton
            type="button"
            pending={pending !== null}
            busy={pending === "recusar"}
            onClick={() => void enviar(false)}
            className="w-full"
          />
        </div>
      </div>
      {rowError ? (
        <p className="mt-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">{rowError}</p>
      ) : null}
    </li>
  );
}

export function ComunidadeConvitesTime({ items }: { items: ConviteTimeItem[] }) {
  if (!items.length) {
    return (
      <p className="mt-2 rounded-xl bg-eid-surface/30 p-2.5 text-[11px] text-eid-text-secondary">
        Nenhum convite de equipe no momento.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <ul className="list-none space-y-3 p-0">
        {items.map((c) => (
          <ConviteTimeRow key={c.id} c={c} />
        ))}
      </ul>
    </div>
  );
}
