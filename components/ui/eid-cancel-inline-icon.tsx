import { X } from "lucide-react";

/** Ícone de cancelar em círculo contornado (alinhado ao botão global). */
export function EidCancelInlineIcon({ compact = false }: { compact?: boolean }) {
  const ring = compact ? "h-3.5 w-3.5" : "h-5 w-5";
  const ico = compact ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border ${ring}`} aria-hidden>
      <X className={ico} strokeWidth={2.75} />
    </span>
  );
}
