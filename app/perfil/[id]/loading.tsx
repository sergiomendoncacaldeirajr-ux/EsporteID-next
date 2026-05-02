import { ProfilePublicRouteLoadingCompact } from "@/components/loading/profile-app-skeletons";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Altura próxima da página real — o skeleton “completo” era bem mais alto e parecia encolher ao hidratar. */
export default function Loading() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <ProfilePublicRouteLoadingCompact />;
}
