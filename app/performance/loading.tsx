import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingPerformance() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-10 w-44 rounded-xl" />
      <SkBlock className="mt-4 h-16 w-full rounded-2xl" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-14 rounded-xl" />
        ))}
      </div>
    </SkMain>
  );
}
