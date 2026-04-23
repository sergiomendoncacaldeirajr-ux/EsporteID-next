import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingDesafio() {
  return (
    <SkMain variant="narrow">
      <SkBlock className="h-7 w-40 rounded-lg" />
      <div className="mt-2 space-y-2">
        <SkBlock className="h-4 w-full rounded-md" />
        <SkBlock className="h-4 w-5/6 rounded-md" />
      </div>

      <div className="mt-3 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:rounded-xl">
        <SkBlock className="h-3 w-11/12 rounded-md" />
        <SkBlock className="mt-2 h-3 w-3/4 rounded-md" />
      </div>

      <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
        <SkBlock className="h-5 w-1/2 rounded-md" />
        <SkBlock className="mt-2 h-4 w-1/3 rounded-md" />
      </div>

      <div className="mt-4 space-y-4">
        <SkBlock className="h-11 w-full rounded-xl sm:w-56" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SkBlock className="h-9 w-40 rounded-xl" />
        <SkBlock className="h-9 w-24 rounded-xl" />
      </div>

      <div className="mt-5 space-y-3">
        <SkBlock className="h-4 w-36 rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-eid-primary-500/35 bg-eid-primary-500/10 p-4">
            <SkBlock className="h-3 w-28 rounded-md" />
            <SkBlock className="mt-2 h-4 w-40 rounded-md" />
            <SkBlock className="mt-2 h-3 w-full rounded-md" />
            <SkBlock className="mt-1 h-3 w-10/12 rounded-md" />
          </div>
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4">
            <SkBlock className="h-3 w-28 rounded-md" />
            <SkBlock className="mt-2 h-4 w-40 rounded-md" />
            <SkBlock className="mt-2 h-3 w-full rounded-md" />
            <SkBlock className="mt-1 h-3 w-10/12 rounded-md" />
          </div>
        </div>
      </div>
    </SkMain>
  );
}
