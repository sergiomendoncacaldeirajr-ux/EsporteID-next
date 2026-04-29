import { Mail } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Linha de notificação padrão: cartão claro, borda suave, ícone de envelope em círculo azul-claro à esquerda.
 * Use em listas de notificações (comunidade, sino, blocos por setor).
 */
export type EidNotificacaoRowProps = {
  children: ReactNode;
  /** Destaque leve quando ainda não foi lida */
  unread?: boolean;
  /** `compact` = preview do sino (padding menor) */
  density?: "comfortable" | "compact";
  className?: string;
};

export function EidNotificacaoRow({
  children,
  unread = false,
  density = "comfortable",
  className = "",
}: EidNotificacaoRowProps) {
  const gapPad =
    density === "compact"
      ? "gap-3 rounded-xl p-2.5"
      : "gap-3 rounded-xl p-3 md:gap-4 md:rounded-2xl md:p-4";
  const iconWrap = density === "compact" ? "h-9 w-9" : "h-10 w-10 md:h-11 md:w-11";
  const iconClass =
    density === "compact" ? "h-4 w-4" : "h-[18px] w-[18px] md:h-5 md:w-5";

  const shell = unread
    ? "border border-eid-primary-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card))_0%,var(--eid-card)_100%)] shadow-[0_1px_0_color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]"
    : "border border-[color:var(--eid-border-subtle)] bg-eid-card";

  const circle =
    "flex shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_17%,transparent)]";

  return (
    <div className={`flex items-start ${gapPad} ${shell} ${className}`.trim()}>
      <span className={`${iconWrap} ${circle}`} aria-hidden>
        <Mail className={`${iconClass} text-eid-primary-500`} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-left">{children}</div>
    </div>
  );
}
