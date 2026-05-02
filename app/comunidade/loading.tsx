import { ComunidadeSocialSkeleton } from "@/components/loading/comunidade-social-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Esqueleto alinhado ao painel social (`/comunidade`): header, push, Desafio, Equipe, aulas, Em breve. */
export default function LoadingComunidade() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <ComunidadeSocialSkeleton />;
}
