import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Página pública do professor (visitante). */
export default function LoadingProfessorPublico() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <SkBlock className="mx-auto h-28 w-28 shrink-0 rounded-full sm:mx-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkBlock className="h-8 w-full max-w-md rounded-lg" />
          <SkBlock className="h-4 w-48 rounded-md" />
          <div className="flex flex-wrap gap-2">
            <SkBlock className="h-9 w-28 rounded-full" />
            <SkBlock className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
