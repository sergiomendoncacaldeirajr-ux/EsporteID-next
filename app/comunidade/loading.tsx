import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Social: blocos de pedidos, notificações e listas. */
export default function LoadingComunidade() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-9 w-52 rounded-xl" />
      <SkBlock className="mt-2 h-4 w-full max-w-xl rounded-md" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
          <SkBlock className="h-5 w-32 rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-20 rounded-xl" />
          ))}
        </section>
        <section className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
          <SkBlock className="h-5 w-40 rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkBlock key={i} className="h-14 rounded-xl" />
          ))}
        </section>
      </div>
      <SkBlock className="mt-8 h-5 w-48 rounded-md" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
