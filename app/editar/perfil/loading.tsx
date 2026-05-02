import { EditarPerfilSkeleton } from "@/components/loading/profile-app-skeletons";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function Loading() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <EditarPerfilSkeleton />;
}
