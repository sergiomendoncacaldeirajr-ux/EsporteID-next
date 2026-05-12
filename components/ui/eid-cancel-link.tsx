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
    ? "min-h-[24px] px-2 text-[7px] font-black uppercase leading-none tracking-[0.07em] md:min-h-[26px] md:text-[8px]"
    : "min-h-[46px] px-4 text-[14px] font-black leading-snug tracking-[0.01em]";
  const iconClass = compact ? "h-3.5 w-3.5" : "h-[14px] w-[14px]";
  const radiusClass = compact ? "rounded-full" : "rounded-xl";
  return (
    <Link
      data-eid-cancel-link="true"
      className={`inline-flex w-full items-center justify-center gap-1 ${radiusClass} border border-red-400/55 bg-red-500/6 text-[color:var(--eid-cancel-inline-fg)] uppercase transition hover:border-red-500/70 hover:bg-red-500/12 hover:text-[color:var(--eid-cancel-inline-hover-fg)] ${sizeClass} ${className}`.trim()}
      {...props}
    >
      <CircleX className={iconClass} aria-hidden />
      <span>{children}</span>
    </Link>
  );
}
