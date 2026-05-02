import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingEspacoAgenda() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <SkBlock className="min-h-[200px] rounded-2xl lg:min-h-[320px]" />
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkBlock key={i} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
