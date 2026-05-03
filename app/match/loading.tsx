import { MatchRadarStreamSkeleton } from "@/components/loading/match-radar-stream-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Skeleton alinhado ao shell refinado do Match (hero + filtros + resultados). */
export default function LoadingMatchPage() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <MatchRadarStreamSkeleton />;
}
