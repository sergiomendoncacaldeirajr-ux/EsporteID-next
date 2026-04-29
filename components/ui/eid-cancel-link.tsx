import Link, { type LinkProps } from "next/link";
import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

type Props = LinkProps & {
  className?: string;
  children?: ReactNode;
  compact?: boolean;
  target?: "_self" | "_blank" | "_parent" | "_top";
};

export function EidCancelLink({ className = "", children = "Cancelar", compact = false, ...props }: Props) {
  const sizeClass = compact
    ? "min-h-[26px] px-2 text-[10px] font-extrabold tracking-[0.04em]"
    : "min-h-[36px] px-3 text-xs font-black tracking-[0.05em]";
  const iconClass = compact ? "h-4 w-4" : "h-[18px] w-[18px]";
  return (
    <Link
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/55 bg-white/95 text-red-600 shadow-[0_6px_18px_-12px_rgba(220,38,38,0.5)] transition hover:bg-red-50 hover:text-red-700 ${sizeClass} ${className}`.trim()}
      {...props}
    >
      <CircleX className={iconClass} aria-hidden />
      <span>{children}</span>
    </Link>
  );
}
