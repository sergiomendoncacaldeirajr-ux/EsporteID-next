import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingProfessorRecebimentos() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <SkBlock className="h-36 rounded-2xl" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkBlock key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
      <SkBlock className="h-64 rounded-2xl" />
    </div>
  );
}
