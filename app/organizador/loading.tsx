import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Painel organizador — hero laranja + KPIs + lista de eventos. */
export default function LoadingOrganizador() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      <div className="rounded-3xl border border-eid-action-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-action-500/10 p-5 shadow-[0_24px_56px_-22px_rgba(249,115,22,0.32)]">
        <SkBlock className="h-4 w-44 rounded-md" />
        <SkBlock className="mt-3 h-8 w-64 max-w-full rounded-lg" />
        <SkBlock className="mt-3 h-4 w-full max-w-2xl rounded-md" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkBlock className="h-10 w-36 rounded-full" />
          <SkBlock className="h-10 w-40 rounded-full" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkBlock key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
