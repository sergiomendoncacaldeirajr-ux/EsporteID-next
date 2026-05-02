import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingContaDadosLgpd() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-8 w-64 rounded-lg" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkBlock key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </SkMain>
  );
}
