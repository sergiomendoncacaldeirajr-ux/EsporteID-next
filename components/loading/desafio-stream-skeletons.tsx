import { SkBlock } from "@/components/loading/skeleton-primitives";

/** Placeholder do bloco “impacto no ranking” no streaming de `/desafio`. */
export function DesafioIndividualImpactStreamSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40 p-3 sm:p-4">
      <SkBlock className="h-3 w-44 rounded-md" />
      <SkBlock className="mt-3 h-20 w-full rounded-xl" />
      <SkBlock className="mt-2 h-10 w-full max-w-sm rounded-lg" />
    </div>
  );
}
