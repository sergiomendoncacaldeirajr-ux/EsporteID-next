import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingDashboard() {
  return (
    <SkMain
      variant="wide5"
      className="pb-[calc(var(--eid-shell-footer-offset)-0.75rem)] sm:pb-[calc(var(--eid-shell-footer-offset)-0.5rem)]"
    >
      <div className="rounded-[1.35rem] border border-eid-primary-500/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-primary-950)_24%,var(--eid-card)_76%))] p-4 sm:rounded-2xl sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <SkBlock className="h-[4.25rem] w-[4.25rem] rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
            <SkBlock className="h-5 w-12 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <SkBlock className="h-7 w-40 rounded-lg sm:h-8 sm:w-48" />
            <SkBlock className="mt-2 h-5 w-full rounded-full sm:w-4/5" />
            <SkBlock className="mt-2 h-4 w-1/2 rounded-md" />
            <div className="mt-2 flex gap-1.5 overflow-hidden">
              <SkBlock className="h-7 w-20 rounded-full" />
              <SkBlock className="h-7 w-24 rounded-full" />
              <SkBlock className="h-7 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <SkBlock className="mt-4 h-12 w-full rounded-xl" />
        <SkBlock className="mt-2 h-12 w-full rounded-xl" />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5 sm:mt-5 sm:gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] px-1 py-1.5 sm:rounded-2xl"
          >
            <SkBlock className="mx-auto h-10 w-10 rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl" />
            <SkBlock className="mx-auto mt-1 h-3 w-14 rounded-md" />
          </div>
        ))}
      </div>

      {Array.from({ length: 4 }).map((_, sectionIdx) => (
        <section
          key={sectionIdx}
          className="mt-7 rounded-[1.2rem] border border-eid-primary-500/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-primary-950)_24%,var(--eid-card)_76%))] px-3 py-2.5 sm:mt-9 sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <SkBlock className="h-3 w-24 rounded-md" />
            <SkBlock className="h-5 w-14 rounded-full" />
          </div>
          {sectionIdx === 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-1 py-1"
                >
                  <SkBlock className="mx-auto h-3 w-12 rounded-md" />
                  <SkBlock className="mx-auto mt-1 h-11 w-11 rounded-full" />
                  <SkBlock className="mx-auto mt-1 h-2.5 w-14 rounded-md" />
                  <SkBlock className="mx-auto mt-px h-2.5 w-12 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 pb-2 pt-1 sm:-mx-6 sm:gap-3 sm:px-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkBlock key={idx} className="h-32 w-[120px] shrink-0 rounded-2xl" />
              ))}
            </div>
          )}
          {sectionIdx === 3 ? (
            <>
              <SkBlock className="mt-3 h-12 w-full rounded-2xl" />
              <SkBlock className="mt-2 h-4 w-full rounded-md" />
            </>
          ) : null}
        </section>
      ))}
      <div className="h-1" />
    </SkMain>
  );
}
