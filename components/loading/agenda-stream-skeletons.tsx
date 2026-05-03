import { SkBlock } from "@/components/loading/skeleton-primitives";

export function AgendaStreamConfrontosSkeleton() {
  return (
    <section className="mt-6 md:mt-10" aria-hidden>
      <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
        <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
          <SkBlock className="h-2.5 w-28 rounded-md" />
          <SkBlock className="h-5 w-14 rounded-full" />
        </div>
        <SkBlock className="mx-3 mt-2 h-3 w-full max-w-xl rounded-md" />
        <div className="mt-3 space-y-4 px-2.5 pb-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkBlock key={i} className="h-36 w-full rounded-2xl md:h-40" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function AgendaStreamRestSkeleton() {
  return (
    <div className="space-y-6 md:space-y-10" aria-hidden>
      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-40 rounded-md" />
            <SkBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkBlock className="m-3 h-24 w-full rounded-xl" />
        </div>
      </section>
      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-36 rounded-md" />
            <SkBlock className="h-5 w-20 rounded-full" />
          </div>
          <div className="m-3 space-y-2">
            <SkBlock className="h-16 w-full rounded-2xl" />
            <SkBlock className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
