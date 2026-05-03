import { CadastrarEquipeSkeleton } from "@/components/loading/profile-app-skeletons";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingConvidarEquipe() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <CadastrarEquipeSkeleton />;
}
