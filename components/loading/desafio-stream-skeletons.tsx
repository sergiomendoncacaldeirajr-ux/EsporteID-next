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

/** Carência coletiva + formulário de envio (streaming em `/desafio` dupla/time). */
export function DesafioColetivoCarenciaEnviarSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/35 p-3 sm:p-4">
        <SkBlock className="h-3 w-[min(92%,20rem)] rounded-md" />
        <SkBlock className="mt-2 h-4 w-3/4 max-w-md rounded-md" />
      </div>
      <SkBlock className="h-12 w-full rounded-xl" />
    </div>
  );
}
