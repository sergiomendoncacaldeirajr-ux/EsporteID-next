import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <SkMain variant="wide5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <SkBlock className="h-9 w-40 rounded-xl" />
        <SkBlock className="h-10 w-24 rounded-full" />
      </div>
      <SkBlock className="mb-10 h-28 w-full rounded-2xl" />
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-center md:gap-4">
        <SkBlock className="mx-auto h-52 w-full max-w-[15rem] rounded-2xl md:order-1" />
        <SkBlock className="mx-auto h-64 w-full max-w-[19rem] rounded-3xl md:order-2" />
        <SkBlock className="mx-auto h-52 w-full max-w-[15rem] rounded-2xl md:order-3" />
      </div>
      <SkBlock className="mb-4 h-4 w-48 rounded-md" />
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-32 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
