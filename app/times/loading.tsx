import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingTimes() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-10 w-40 rounded-xl" />
      <SkBlock className="mt-4 h-10 w-full rounded-xl" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-28 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
