import { ProfilePublicRouteLoadingCompact } from "@/components/loading/profile-app-skeletons";

/** Altura próxima da página real — o skeleton “completo” era bem mais alto e parecia encolher ao hidratar. */
export default function Loading() {
  return <ProfilePublicRouteLoadingCompact />;
}
