import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidPanelHeader } from "@/components/ui/eid-panel-header";
import type { ReactNode } from "react";

/** Cabeçalho de subseção — o bloco principal já é o único “quadro”. */
export function ComunidadeQuadro({
  id,
  title,
  hasPending,
  badgeLabel = "Pendente",
  headerBadgeExtra,
  info,
  children,
}: {
  id: string;
  title: string;
  hasPending: boolean;
  badgeLabel?: string;
  /** Selos extras ao lado do pendente (ex.: Ranking no único pedido recebido). */
  headerBadgeExtra?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
}) {
  if (!hasPending) return null;
  return (
    <div id={id} className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/35">
      <EidPanelHeader
        title={title}
        titleAs="h3"
        badge={
          <>
            <EidPendingBadge label={badgeLabel} />
            {headerBadgeExtra}
          </>
        }
        info={info}
      />
      <div className="min-w-0 p-2.5 md:p-3">{children}</div>
    </div>
  );
}
