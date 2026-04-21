import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Página pública do torneio — banner, título e blocos de ação. */
export default function LoadingTorneioDetalhe() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-7 w-28 rounded-lg" />
      <SkBlock className="mt-4 aspect-[21/9] w-full max-h-48 rounded-2xl sm:max-h-56" />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <SkBlock className="h-9 w-full max-w-md rounded-lg" />
          <SkBlock className="h-4 w-48 rounded-md" />
        </div>
        <SkBlock className="h-12 w-full max-w-[200px] rounded-xl sm:w-48" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        <SkBlock className="h-5 w-40 rounded-md" />
        <SkBlock className="h-32 w-full rounded-2xl" />
        <SkBlock className="h-32 w-full rounded-2xl" />
      </div>
    </SkMain>
  );
}
