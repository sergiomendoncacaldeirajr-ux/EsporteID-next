import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import type { ReactNode } from "react";

/** Cabeçalho de subseção — o bloco principal já é o único “quadro”. */
export function ComunidadeQuadro({
  id,
  title,
  hasPending,
  badgeLabel = "Pendente",
  headerBadgeExtra,
  children,
}: {
  id: string;
  title: string;
  hasPending: boolean;
  badgeLabel?: string;
  /** Selos extras ao lado do pendente (ex.: Ranking no único pedido recebido). */
  headerBadgeExtra?: ReactNode;
  children: ReactNode;
}) {
  if (!hasPending) return null;
  return (
    <div id={id} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 text-[11px] font-black tracking-tight text-eid-primary-500 eid-dark:text-eid-primary-300">{title}</h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <EidPendingBadge label={badgeLabel} />
          {headerBadgeExtra}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
