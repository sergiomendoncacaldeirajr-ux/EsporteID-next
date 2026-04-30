"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { EidCancelInlineIcon } from "@/components/ui/eid-cancel-inline-icon";

export { EidCancelInlineIcon } from "@/components/ui/eid-cancel-inline-icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  /** Substitui o ícone padrão (útil só se não quiser o selo X em círculo). */
  icon?: ReactNode;
  compact?: boolean;
};

export function EidCancelButton({
  loading = false,
  label = "Cancelar",
  loadingLabel = "Cancelando...",
  icon,
  className = "",
  compact = false,
  disabled,
  type = "button",
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  const textClass = compact
    ? "text-[10px] font-black uppercase leading-none tracking-[0.05em]"
    : "text-[14px] font-black leading-snug tracking-[0.01em]";
  const densityClass = compact ? "min-h-[30px] gap-1.5 px-2.5 py-1" : "min-h-[46px] gap-2 px-4 py-2";
  const baseShell =
    "inline-flex w-full items-center justify-center rounded-xl border border-red-400/55 bg-red-500/6 text-[color:var(--eid-cancel-inline-fg)] transition hover:border-red-500/70 hover:bg-red-500/12 hover:text-[color:var(--eid-cancel-inline-hover-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--eid-danger-500)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eid-card)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <button
      type={type}
      disabled={isDisabled}
      {...(compact ? { "data-eid-cancel-pendente-btn": "true" as const } : {})}
      className={`${baseShell} ${densityClass} ${textClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <Loader2 className={`${compact ? "h-3 w-3" : "h-5 w-5"} shrink-0 animate-spin text-[color:var(--eid-cancel-inline-fg)]`} aria-hidden />
      ) : (
        (icon ?? <EidCancelInlineIcon compact={compact} />)
      )}
      <span className={loading ? "eid-social-action-loading-text" : ""}>{loading ? loadingLabel : label}</span>
    </button>
  );
}
