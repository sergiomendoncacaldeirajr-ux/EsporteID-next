import { AgendaPageSkeleton } from "@/components/loading/agenda-page-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Esqueleto alinhado à página `/agenda` (conexões, jogos, desafios aceitos, pedidos, rodapé). */
export default function LoadingAgenda() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <AgendaPageSkeleton />;
}
