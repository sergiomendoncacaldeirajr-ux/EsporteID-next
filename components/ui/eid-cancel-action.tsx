import type { ButtonHTMLAttributes } from "react";
import { EidCancelInlineIcon } from "@/components/ui/eid-cancel-inline-icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  compact?: boolean;
};

export function EidCancelAction({ label = "Cancelar", compact = false, className = "", ...props }: Props) {
  const textClass = compact
    ? "text-[10px] font-black uppercase leading-none tracking-[0.05em]"
    : "text-[14px] font-black leading-snug tracking-[0.01em]";
  const densityClass = compact ? "min-h-[30px] gap-1.5 px-2.5 py-1" : "min-h-[46px] gap-2 px-4 py-2";

  return (
    <button
      type="submit"
      {...(compact ? { "data-eid-cancel-pendente-btn": "true" as const } : {})}
      className={`inline-flex w-full items-center justify-center rounded-xl border border-red-400/55 bg-red-500/6 text-[color:var(--eid-cancel-inline-fg)] transition hover:border-red-500/70 hover:bg-red-500/12 hover:text-[color:var(--eid-cancel-inline-hover-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--eid-danger-500)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eid-card)] disabled:cursor-not-allowed disabled:opacity-50 ${densityClass} ${textClass} ${className}`.trim()}
      {...props}
    >
      <EidCancelInlineIcon compact={compact} />
      <span>{label}</span>
    </button>
  );
}
