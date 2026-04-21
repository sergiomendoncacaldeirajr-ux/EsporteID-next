import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingMatchPage() {
  return (
    <SkMain variant="match">
      <SkBlock className="mb-3 h-14 rounded-[var(--eid-radius-lg)]" />
      <div className="grid gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkBlock key={idx} className="h-20 rounded-[var(--eid-radius-lg)]" />
        ))}
      </div>
      <section className="mt-4 grid gap-2.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-24 rounded-[var(--eid-radius-lg)]" />
        ))}
      </section>
    </SkMain>
  );
}
