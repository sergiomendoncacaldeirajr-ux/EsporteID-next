"use client";

/**
 * Botões padrão Aceitar/Recusar (cards sociais / Comunidade e telas alinhadas).
 *
 * Fonte de estilo e tamanho:
 * - Classes: `PEDIDO_MATCH_RECEBIDO_SOCIAL_*` em `lib/desafio/flow-ui.ts`
 * - Touch / SVG: `button[data-eid-social-acao-btn="true"]` em `app/globals.css`
 * - Marcação: `EID_SOCIAL_ACAO_BTN_ATTR` em `lib/comunidade/social-panel-layout.ts`
 *
 * Uso típico: dois `<form>` lado a lado com `PEDIDO_MATCH_RECEBIDO_FORM_CLASS`, `pending` do
 * `useActionState`, estado local `busy` = `pending && <este item> && <qual ação>`, e `onClick`
 * que registra qual botão foi pressionado antes do submit.
 */

import { Check, Loader2, X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { EID_SOCIAL_ACAO_BTN_ATTR } from "@/lib/comunidade/social-panel-layout";
import {
  PEDIDO_MATCH_RECEBIDO_SOCIAL_ACEITAR_BTN_CLASS,
  PEDIDO_MATCH_RECEBIDO_SOCIAL_RECUSAR_BTN_CLASS,
  PEDIDO_SOCIAL_LIGHT_ICON_RING_ACEITAR,
  PEDIDO_SOCIAL_LIGHT_ICON_RING_RECUSAR,
} from "@/lib/desafio/flow-ui";

const ICON_STROKE = 2.75;

export type EidSocialAceitarButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** `useActionState` / transition — desativa os dois botões da linha. */
  pending: boolean;
  /** Spinner + texto “…ando” — ex.: `pending && idCombinado && aceitar`. */
  busy: boolean;
  /** `aprovar` → Aprovar / Aprovando… (sugestões); padrão Aceitar / Aceitando… */
  actionLabel?: "aceitar" | "aprovar";
};

export function EidSocialAceitarButton({
  pending,
  busy,
  actionLabel = "aceitar",
  className = "",
  type = "submit",
  ...props
}: EidSocialAceitarButtonProps) {
  const idle = actionLabel === "aprovar" ? "Aprovar" : "Aceitar";
  const loadingText = "Aprovando…";
  return (
    <button
      type={type}
      disabled={pending}
      {...EID_SOCIAL_ACAO_BTN_ATTR}
      className={`${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACEITAR_BTN_CLASS} ${className}`.trim()}
      {...props}
    >
      {busy ? (
        <span className={`${PEDIDO_SOCIAL_LIGHT_ICON_RING_ACEITAR} mr-0.5 sm:mr-1`}>
          <Loader2 className="h-[3px] w-[3px] shrink-0 animate-spin sm:h-1 sm:w-1" strokeWidth={ICON_STROKE} aria-hidden />
        </span>
      ) : (
        <span className={`${PEDIDO_SOCIAL_LIGHT_ICON_RING_ACEITAR} mr-0.5 sm:mr-1`}>
          <Check className="h-[3px] w-[3px] sm:h-1 sm:w-1" strokeWidth={ICON_STROKE} aria-hidden />
        </span>
      )}
      <span className={busy ? "eid-social-action-loading-text" : ""}>{busy ? loadingText : idle}</span>
    </button>
  );
}

export type EidSocialRecusarButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  pending: boolean;
  busy: boolean;
  /** Pedido de desafio recebido: ativa `data-eid-recusar-btn` (fluxos que dependem desse marcador). */
  withDesafioRecusarMarker?: boolean;
};

export function EidSocialRecusarButton({
  pending,
  busy,
  withDesafioRecusarMarker = false,
  className = "",
  type = "submit",
  ...props
}: EidSocialRecusarButtonProps) {
  return (
    <button
      type={type}
      disabled={pending}
      {...EID_SOCIAL_ACAO_BTN_ATTR}
      {...(withDesafioRecusarMarker ? { "data-eid-recusar-btn": "true" as const } : {})}
      className={`${PEDIDO_MATCH_RECEBIDO_SOCIAL_RECUSAR_BTN_CLASS} ${className}`.trim()}
      {...props}
    >
      {busy ? (
        <span className={`${PEDIDO_SOCIAL_LIGHT_ICON_RING_RECUSAR} mr-0.5 sm:mr-1`}>
          <Loader2 className="h-[3px] w-[3px] shrink-0 animate-spin sm:h-1 sm:w-1" strokeWidth={ICON_STROKE} aria-hidden />
        </span>
      ) : (
        <span className={`${PEDIDO_SOCIAL_LIGHT_ICON_RING_RECUSAR} mr-0.5 sm:mr-1`}>
          <X className="h-[3px] w-[3px] sm:h-1 sm:w-1" strokeWidth={ICON_STROKE} aria-hidden />
        </span>
      )}
      <span className={busy ? "eid-social-action-loading-text" : ""}>{busy ? "Recusando…" : "Recusar"}</span>
    </button>
  );
}
