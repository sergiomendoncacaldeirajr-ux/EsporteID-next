import { X } from "lucide-react";

/** Círculo vermelho com X branco, dentro de quadrado arredondado (referência UI social). */
export function EidCancelInlineIcon({ compact = false }: { compact?: boolean }) {
  const ring = compact ? "rounded-md p-px" : "rounded-lg p-1";
  const dot = compact ? "h-3 w-3" : "h-5 w-5";
  const ico = compact ? "h-1.5 w-1.5" : "h-2.5 w-2.5";
  return (
    <span
      className={`inline-flex shrink-0 border border-[color:var(--eid-cancel-icon-ring-border)] bg-[var(--eid-cancel-icon-ring-bg)] ${ring}`}
      aria-hidden
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[var(--eid-cancel-icon-dot-bg)] ${dot}`}
      >
        <X className={`${ico} text-[var(--eid-cancel-icon-fg)]`} strokeWidth={2.75} />
      </span>
    </span>
  );
}
