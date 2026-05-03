import { LocaisCadastrarStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function CadastrarLocalLoading() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <LocaisCadastrarStreamSkeleton />;
}
