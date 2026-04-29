import type { ButtonHTMLAttributes } from "react";
import { EidCancelInlineIcon } from "@/components/ui/eid-cancel-inline-icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  compact?: boolean;
};

export function EidCancelAction({ label = "Cancelar", compact = false, className = "", ...props }: Props) {
  const textClass = compact
    ? "text-[11px] font-semibold leading-snug tracking-normal"
    : "text-sm font-semibold leading-snug tracking-normal";

  return (
    <button
      type="submit"
      className={`inline-flex items-center gap-2 rounded-lg bg-transparent px-0 py-1 text-left text-[color:var(--eid-cancel-inline-fg)] transition hover:text-[color:var(--eid-cancel-inline-hover-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--eid-danger-500)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eid-card)] disabled:cursor-not-allowed disabled:opacity-50 ${textClass} ${className}`.trim()}
      {...props}
    >
      <EidCancelInlineIcon compact={compact} />
      <span>{label}</span>
    </button>
  );
}
