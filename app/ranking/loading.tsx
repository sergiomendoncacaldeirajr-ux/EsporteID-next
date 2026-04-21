import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <SkMain variant="wide5">
      <div className="mb-7 flex items-center justify-between gap-4">
        <SkBlock className="h-9 w-40 rounded-xl" />
        <SkBlock className="h-10 w-24 rounded-full" />
      </div>
      <SkBlock className="mb-9 h-28 w-full rounded-2xl" />
      <div className="mb-11 flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-6">
        <SkBlock className="h-48 w-[32%] max-w-[15rem] rounded-2xl" />
        <SkBlock className="h-56 w-[36%] max-w-[19rem] rounded-3xl" />
        <SkBlock className="h-48 w-[32%] max-w-[15rem] rounded-2xl" />
      </div>
      <SkBlock className="mb-4 h-4 w-56 rounded-md" />
      <div className="grid gap-4 md:gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-36 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
