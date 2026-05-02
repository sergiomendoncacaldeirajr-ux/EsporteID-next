import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Landing / home — alinhado ao `app/page.tsx` (max-w-4xl, hero + cards “Como funciona”). */
export default function LoadingHome() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <SkMain variant="landing">
        <SkBlock className="mx-auto h-14 w-56 rounded-xl sm:h-16 sm:w-64" />
        <SkBlock className="mx-auto mt-6 h-4 w-40 rounded-md" />
        <SkBlock className="mt-3 h-10 w-full max-w-2xl rounded-lg" />
        <SkBlock className="mt-2 h-4 w-full max-w-xl rounded-md" />
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-eid-primary-500/35 bg-gradient-to-b from-eid-primary-500/15 to-eid-primary-500/5 p-6 sm:p-8">
          <SkBlock className="mx-auto h-5 w-full max-w-md rounded-md" />
          <SkBlock className="mx-auto mt-3 h-4 w-full max-w-lg rounded-md" />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SkBlock className="h-14 flex-1 rounded-2xl sm:max-w-xs" />
            <SkBlock className="h-14 flex-1 rounded-2xl sm:max-w-xs" />
          </div>
        </div>
        <SkBlock className="mt-12 h-6 w-40 rounded-md" />
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-5">
              <SkBlock className="h-8 w-8 rounded-full" />
              <SkBlock className="mt-3 h-5 max-w-[85%] rounded-md" />
              <SkBlock className="mt-2 h-3 w-full rounded-md" />
              <SkBlock className="mt-2 h-3 w-full rounded-md" />
            </li>
          ))}
        </ol>
      </SkMain>
    </div>
  );
}
