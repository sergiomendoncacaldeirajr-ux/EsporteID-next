import { SkBlock } from "@/components/loading/skeleton-primitives";

export function TimesVagasPedidosSkeleton() {
  return (
    <section id="pedidos-elenco" className="mb-4 scroll-mt-24" aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <SkBlock className="h-4 w-48 rounded-md" />
          <SkBlock className="h-5 w-24 rounded-full" />
        </div>
        <SkBlock className="mt-3 h-20 w-full rounded-xl" />
      </div>
    </section>
  );
}

export function TimesVagasListaSkeleton() {
  return (
    <div id="vagas-recrutamento" className="scroll-mt-24" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
