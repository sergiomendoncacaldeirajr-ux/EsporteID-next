import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Shell compacto alinhado ao radar Match (client). */
export default function LoadingMatchPage() {
  return (
    <SkMain variant="match">
      <SkBlock className="mb-3 h-24 w-full rounded-3xl" />
      <SkBlock className="mb-3 h-16 w-full rounded-2xl" />
      <div className="mb-3 flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkBlock key={i} className="h-11 flex-1 rounded-2xl" />
        ))}
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <SkBlock className="h-28 rounded-2xl" />
        <SkBlock className="h-28 rounded-2xl" />
      </div>
      <SkBlock className="mb-4 h-20 rounded-2xl" />
      <section className="grid gap-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkBlock key={idx} className="h-[7.5rem] rounded-2xl" />
        ))}
      </section>
    </SkMain>
  );
}
