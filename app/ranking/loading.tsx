import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <div className="relative flex w-full min-w-0 flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 max-h-[28rem] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)] sm:h-72"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-2xl flex-col px-4 pb-3 pt-1.5 sm:px-5">
        <header className="mb-1.5">
          <SkBlock className="h-7 w-28 rounded-lg" />
        </header>

        <section className="mb-3 space-y-2">
          <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
            <div className="rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)] p-0">
              <SkBlock className="h-[1.62rem] w-full rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
            <SkBlock className="h-[1.62rem] rounded-md" />
            <SkBlock className="h-[1.62rem] rounded-md" />
          </div>

          <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden pb-0.5 pr-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <SkBlock key={i} className="h-[1.62rem] w-16 shrink-0 rounded-md" />
              ))}
            </div>
          </div>
        </section>

        <section className="relative mb-0.5">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 px-2.5 py-3 backdrop-blur-sm shadow-[0_16px_30px_-20px_rgba(15,23,42,0.35)]">
            <div className="mb-0 flex items-center justify-between gap-1.5">
              <SkBlock className="h-6 w-20 rounded-full" />
              <SkBlock className="h-6 w-20 rounded-full" />
            </div>

            <SkBlock className="mx-auto mb-2 h-2.5 w-16 rounded-md" />

            <div className="flex flex-row items-end justify-center gap-2">
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-32 w-full rounded-2xl" />
              </div>
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-40 w-full rounded-2xl" />
              </div>
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2">
          <SkBlock className="mb-0.5 h-2.5 w-20 rounded-md" />
          <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 px-2.5 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)] sm:px-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5">
                <SkBlock className="h-5 w-7 rounded-md" />
                <SkBlock className="h-9 w-9 rounded-full" />
                <SkBlock className="h-3.5 flex-1 rounded-md" />
                <SkBlock className="h-4 w-10 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
