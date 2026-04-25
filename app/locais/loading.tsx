import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingLocais() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-36 rounded-2xl sm:h-44" />
      <div className="mt-4 rounded-2xl border border-[color:var(--eid-border-subtle)] p-2">
        <SkBlock className="h-11 rounded-xl" />
      </div>
      <SkBlock className="mt-3 h-3 w-64 rounded-full" />

      {Array.from({ length: 4 }).map((_, sectionIdx) => (
        <section key={sectionIdx} className="mt-6">
          <SkBlock className="mb-3 h-4 w-56 rounded-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`${sectionIdx}-${idx}`} className="rounded-2xl border border-[color:var(--eid-border-subtle)] p-3">
                <SkBlock className="h-24 rounded-xl" />
                <SkBlock className="mt-3 h-3 w-20 rounded-full" />
                <SkBlock className="mt-2 h-4 w-44 rounded-full" />
                <SkBlock className="mt-2 h-3 w-52 rounded-full" />
                <SkBlock className="mt-1.5 h-3 w-36 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-8 flex items-center justify-between">
        <SkBlock className="h-9 w-28 rounded-xl" />
        <SkBlock className="h-3 w-20 rounded-full" />
        <SkBlock className="h-9 w-28 rounded-xl" />
      </div>
      <div className="h-2" />
    </SkMain>
  );
}
