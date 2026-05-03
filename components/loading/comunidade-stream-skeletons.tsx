import { SkBlock } from "@/components/loading/skeleton-primitives";

export function ComunidadeStreamPartidasSkeleton() {
  return (
    <div className="space-y-2 py-0.5" aria-hidden>
      <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 md:p-4">
        <SkBlock className="h-3 w-40 rounded-md" />
        <SkBlock className="mt-3 h-24 w-full rounded-xl md:h-28" />
        <SkBlock className="mt-3 h-24 w-full rounded-xl md:h-28" />
      </section>
    </div>
  );
}

export function ComunidadeStreamDesafioSkeleton() {
  return (
    <div className="space-y-2 py-0.5" aria-hidden>
      <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 md:p-4">
        <SkBlock className="h-3 w-28 rounded-md" />
        <SkBlock className="mt-2 hidden h-3 w-full max-w-md rounded-md md:block" />
        <SkBlock className="mt-4 h-32 w-full rounded-xl" />
        <SkBlock className="mt-3 h-24 w-full rounded-xl" />
      </section>
    </div>
  );
}

export function ComunidadeStreamEquipeSkeleton() {
  return (
    <div className="space-y-2 py-0.5" aria-hidden>
      <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 md:p-4">
        <SkBlock className="h-3 w-24 rounded-md" />
        <SkBlock className="mt-3 h-20 w-full rounded-xl" />
        <SkBlock className="mt-3 h-20 w-full rounded-xl" />
        <SkBlock className="mt-3 h-28 w-full rounded-xl" />
      </section>
    </div>
  );
}
