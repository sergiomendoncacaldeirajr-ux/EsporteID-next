import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingRanking() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,28rem)] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)]"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-3 pt-1 sm:max-w-2xl sm:px-6 sm:pb-4 sm:pt-2">
        <header className="mb-1.5 sm:mb-2">
          <SkBlock className="h-8 w-32 rounded-lg" />
        </header>

        <section className="mb-3 space-y-2 px-2 sm:mb-3.5">
          <div className="rounded-xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_76%,var(--eid-bg)_24%),color-mix(in_srgb,var(--eid-surface)_70%,var(--eid-bg)_30%))] p-1.5 backdrop-blur-sm">
            <SkBlock className="h-[1.86rem] w-full rounded-md" />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1.5 backdrop-blur-sm">
            <SkBlock className="h-[1.86rem] rounded-md" />
            <SkBlock className="h-[1.86rem] rounded-md" />
          </div>

          <div className="rounded-xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1.5 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden pb-1 pr-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <SkBlock key={i} className="h-[1.86rem] w-20 shrink-0 rounded-md" />
              ))}
            </div>
          </div>
        </section>

        <section className="relative mb-0.5 sm:mb-1">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 px-2 py-2.5 backdrop-blur-sm shadow-[0_16px_30px_-20px_rgba(15,23,42,0.35)] sm:px-3 sm:py-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
              <SkBlock className="h-6.5 w-24 rounded-full" />
              <SkBlock className="h-6.5 w-24 rounded-full" />
            </div>

            <SkBlock className="mx-auto mb-2 h-3 w-20 rounded-md sm:mb-2.5" />

            <div className="flex flex-row items-end justify-center gap-2 sm:gap-3.5 md:gap-4.5">
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-36 w-full rounded-2xl" />
              </div>
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-44 w-full rounded-2xl" />
              </div>
              <div className="w-[31.5%] max-w-[10.25rem]">
                <SkBlock className="h-36 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2 sm:mt-2.5">
          <SkBlock className="mb-1 h-3 w-24 rounded-md" />
          <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 px-2.5 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)] sm:px-3.5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5 sm:gap-2.5 sm:py-2">
                <SkBlock className="h-6 w-7 rounded-md sm:w-8" />
                <SkBlock className="h-9 w-9 rounded-full sm:h-10 sm:w-10" />
                <SkBlock className="h-4 flex-1 rounded-md" />
                <SkBlock className="h-5 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
