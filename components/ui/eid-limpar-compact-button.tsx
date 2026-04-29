"use client";

/**
 * Botão compacto “Limpar” (lixeira + texto), com estado **Limpando…** e spinner.
 *
 * Estilo: `PEDIDO_LIMPAR_COMPACT_BTN_CLASS` em `lib/desafio/flow-ui.ts`.
 * Touch / SVG: `button[data-eid-limpar-compact-btn="true"]` em `app/globals.css`.
 *
 * - `pending`: desativa o botão (ex.: ação em andamento).
 * - `busy`: este controle mostra spinner + “Limpando…” (ex.: `pending && idDaLinha`).
 */

import { Loader2, Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { PEDIDO_LIMPAR_COMPACT_BTN_CLASS } from "@/lib/desafio/flow-ui";

export const EID_LIMPAR_COMPACT_BTN_ATTR = { "data-eid-limpar-compact-btn": "true" } as const;

const ICON_STROKE = 2.5;

export type EidLimparCompactButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  pending: boolean;
  /** Spinner + “Limpando…” neste botão. */
  busy: boolean;
};

export function EidLimparCompactButton({
  pending,
  busy,
  className = "",
  type = "button",
  ...props
}: EidLimparCompactButtonProps) {
  return (
    <button
      type={type}
      disabled={pending}
      {...EID_LIMPAR_COMPACT_BTN_ATTR}
      className={`${PEDIDO_LIMPAR_COMPACT_BTN_CLASS} ${className}`.trim()}
      {...props}
    >
      {busy ? (
        <Loader2 className="shrink-0 animate-spin opacity-90" strokeWidth={ICON_STROKE} aria-hidden />
      ) : (
        <Trash2 className="shrink-0 opacity-90" strokeWidth={ICON_STROKE} aria-hidden />
      )}
      <span>{busy ? "Limpando…" : "Limpar"}</span>
    </button>
  );
}
