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
    ? "min-h-[30px] px-2.5 text-[10px] font-black uppercase leading-none tracking-[0.05em]"
    : "min-h-[46px] px-4 text-[14px] font-black leading-snug tracking-[0.01em]";
  const iconClass = compact ? "h-4 w-4" : "h-[18px] w-[18px]";
  return (
    <Link
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/55 bg-red-500/6 text-[color:var(--eid-cancel-inline-fg)] transition hover:border-red-500/70 hover:bg-red-500/12 hover:text-[color:var(--eid-cancel-inline-hover-fg)] ${sizeClass} ${className}`.trim()}
      {...props}
    >
      <CircleX className={iconClass} aria-hidden />
      <span>{children}</span>
    </Link>
  );
}
