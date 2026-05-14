import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EID_PANEL_HEADER_CLASS, EID_PANEL_TITLE_CLASS } from "@/components/ui/eid-panel-header";
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
    <div id={id} className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/35">
      <div className={EID_PANEL_HEADER_CLASS}>
        <h3 className={EID_PANEL_TITLE_CLASS}>{title}</h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <EidPendingBadge label={badgeLabel} />
          {headerBadgeExtra}
        </div>
      </div>
      <div className="min-w-0 p-2.5 md:p-3">{children}</div>
    </div>
  );
}
