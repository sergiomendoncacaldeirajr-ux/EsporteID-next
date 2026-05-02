import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingProfessorAvaliacoes() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkBlock key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}
