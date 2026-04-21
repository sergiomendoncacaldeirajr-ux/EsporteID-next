import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Página de local / espaço na listagem. */
export default function LoadingLocalPublico() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-7 w-32 rounded-lg" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SkBlock className="aspect-video w-full rounded-2xl lg:aspect-auto lg:min-h-[220px]" />
        <div className="space-y-3">
          <SkBlock className="h-8 w-3/4 max-w-sm rounded-lg" />
          <SkBlock className="h-4 w-full rounded-md" />
          <SkBlock className="h-4 w-4/5 rounded-md" />
          <SkBlock className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </SkMain>
  );
}
