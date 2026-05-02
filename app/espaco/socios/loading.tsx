import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingEspacoSocios() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SkBlock className="h-10 w-40 rounded-xl" />
        <SkBlock className="h-10 flex-1 rounded-xl" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkBlock key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
