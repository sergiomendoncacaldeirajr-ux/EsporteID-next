import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Conteúdo abaixo do hero do `espaco/layout`. */
export default function LoadingEspacoHome() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-52 rounded-md" />
          <SkBlock className="mt-2 h-4 w-full max-w-xl rounded-md" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBlock key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-44 rounded-md" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkBlock key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <SkBlock className="h-48 rounded-2xl" />
        <SkBlock className="h-40 rounded-2xl" />
      </section>
    </div>
  );
}
