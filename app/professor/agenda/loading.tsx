import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingProfessorAgenda() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-56 rounded-md" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBlock key={i} className="h-11 rounded-xl" />
            ))}
          </div>
          <SkBlock className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </section>
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <SkBlock className="h-6 w-40 rounded-md" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkBlock key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
