import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingAdmin() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-9 w-72 rounded-lg" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </SkMain>
  );
}
