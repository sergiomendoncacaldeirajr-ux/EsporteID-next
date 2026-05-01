import { Clock3 } from "lucide-react";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  compact?: boolean;
};

export function EidPendingBadge({ label = "Pendente", compact = false, className = "", ...props }: Props) {
  const sizeClass = compact
    ? "px-1.5 py-[1px] text-[7px]"
    : "px-1.5 py-0.5 text-[8px]";
  const iconClass = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-warning-500)_48%,var(--eid-border-subtle)_52%)] bg-[color:color-mix(in_srgb,var(--eid-warning-500)_15%,var(--eid-card)_85%)] ${sizeClass} font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-warning-500)_86%,var(--eid-fg)_14%)] ${className}`.trim()}
      {...props}
    >
      <Clock3 className={iconClass} aria-hidden />
      {label}
    </span>
  );
}
