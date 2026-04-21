import { SkBlock } from "@/components/loading/skeleton-primitives";

/** Conteúdo abaixo do hero do `professor/layout` — resumo + coluna lateral. */
export default function LoadingProfessorHome() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <SkBlock className="h-6 w-48 rounded-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkBlock key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <SkBlock className="mt-3 h-28 rounded-xl" />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkBlock key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <SkBlock className="mt-5 h-32 rounded-xl" />
      </section>
      <section className="grid gap-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-40 rounded-md" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkBlock key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-32 rounded-md" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkBlock key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
