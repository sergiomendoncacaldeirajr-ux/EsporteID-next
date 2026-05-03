import { PerfilFormacaoStreamSkeleton } from "@/components/loading/perfil-formacao-stream-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingPerfilTimePage() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <PerfilFormacaoStreamSkeleton />;
}
