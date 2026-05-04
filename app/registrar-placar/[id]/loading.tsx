import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingRegistrarPlacar() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="narrow">
      <SkBlock className="h-7 w-48 rounded-lg" />
      <div className="mt-2 space-y-2">
        <SkBlock className="h-4 w-full rounded-md" />
        <SkBlock className="h-4 w-4/5 rounded-md" />
      </div>
      <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
        <SkBlock className="h-5 w-2/3 rounded-md" />
        <SkBlock className="mt-3 h-24 w-full rounded-xl" />
        <SkBlock className="mt-3 h-11 w-full rounded-xl sm:w-64" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SkBlock className="h-10 flex-1 rounded-xl sm:min-w-[140px]" />
        <SkBlock className="h-10 w-28 rounded-xl" />
      </div>
    </SkMain>
  );
}
