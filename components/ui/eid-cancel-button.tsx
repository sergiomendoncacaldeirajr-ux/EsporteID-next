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
    ? "text-[11px] font-semibold leading-none tracking-normal"
    : "text-sm font-semibold leading-snug tracking-normal";
  const densityClass = compact ? "gap-1 py-0" : "gap-2 py-1";

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center rounded-lg bg-transparent px-0 text-left text-[color:var(--eid-cancel-inline-fg)] transition hover:text-[color:var(--eid-cancel-inline-hover-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--eid-danger-500)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eid-card)] disabled:cursor-not-allowed disabled:opacity-50 ${densityClass} ${textClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <Loader2 className={`${compact ? "h-3 w-3" : "h-5 w-5"} shrink-0 animate-spin text-[color:var(--eid-cancel-inline-fg)]`} aria-hidden />
      ) : (
        (icon ?? <EidCancelInlineIcon compact={compact} />)
      )}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
