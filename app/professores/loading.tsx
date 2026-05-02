import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingProfessoresCatalogo() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-10 w-56 rounded-xl" />
      <SkBlock className="mt-2 h-4 max-w-xl rounded-md" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkBlock key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
