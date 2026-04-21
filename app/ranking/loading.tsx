import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-10 w-40 rounded-xl" />
      <SkBlock className="mt-4 h-16 w-full rounded-2xl" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkBlock key={idx} className="h-24 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
