import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <SkMain variant="wide5">
      <div className="mb-7 flex items-center justify-between gap-4">
        <SkBlock className="h-9 w-40 rounded-xl" />
        <SkBlock className="h-10 w-24 rounded-full" />
      </div>
      <SkBlock className="mb-5 h-24 w-full rounded-2xl" />
      <div className="mb-8 flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-6">
        <SkBlock className="h-40 w-[32%] max-w-[12rem] rounded-2xl" />
        <SkBlock className="h-44 w-[34%] max-w-[13rem] rounded-2xl" />
        <SkBlock className="h-40 w-[32%] max-w-[12rem] rounded-2xl" />
      </div>
      <SkBlock className="mb-3 h-3 w-40 rounded-md" />
      <div className="space-y-2 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40 p-2">
        {Array.from({ length: 10 }).map((_, idx) => (
          <SkBlock key={idx} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </SkMain>
  );
}
