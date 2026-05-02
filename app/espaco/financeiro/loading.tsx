import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingEspacoFinanceiro() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <SkBlock className="h-12 w-full max-w-md rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkBlock key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
