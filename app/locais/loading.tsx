import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";

export default function LoadingLocais() {
  return (
    <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col" data-eid-locais-page>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg"
        aria-hidden
      />
      <SkMain
        variant="wide5"
        className="relative z-[1] pb-[calc(var(--eid-shell-footer-offset)+0.75rem)] sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      >
        <div className={`eid-locais-hero relative mb-4 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-5 md:mb-6`}>
          <SkBlock className="h-2.5 w-28 rounded-full" />
          <SkBlock className="mt-2 h-8 w-4/5 max-w-md rounded-lg" />
          <SkBlock className="mt-2 h-10 w-full max-w-xl rounded-md" />
          <SkBlock className="mt-4 h-11 w-full max-w-xs rounded-xl" />
        </div>

        <div className="eid-locais-search-card mb-4 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
          <div className="eid-locais-section-head flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] px-3 py-2.5 sm:px-4">
            <SkBlock className="h-3 w-32 rounded-md" />
            <SkBlock className="h-5 w-24 rounded-full" />
          </div>
          <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
            <SkBlock className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <SkBlock className="mb-6 h-12 w-full max-w-lg rounded-xl sm:mb-8" />

        {Array.from({ length: 4 }).map((_, sectionIdx) => (
          <section key={sectionIdx} className="mb-6 sm:mb-8">
            <div className="eid-locais-section overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
              <div className="eid-locais-section-head flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] px-3 py-2.5 sm:px-4">
                <SkBlock className="h-3 w-40 rounded-md" />
                <SkBlock className="h-5 w-16 rounded-full" />
              </div>
              <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((__, idx) => (
                    <div
                      key={`${sectionIdx}-${idx}`}
                      className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40"
                    >
                      <SkBlock className="h-28 w-full rounded-none rounded-t-2xl" />
                      <div className="space-y-2 p-3">
                        <SkBlock className="h-3 w-24 rounded-full" />
                        <SkBlock className="h-4 w-3/4 rounded-md" />
                        <SkBlock className="h-3 w-full rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        <div className="eid-locais-pagination mt-8 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 sm:px-4">
          <SkBlock className="h-9 w-28 rounded-xl" />
          <SkBlock className="h-3 w-20 rounded-full" />
          <SkBlock className="h-9 w-28 rounded-xl" />
        </div>
        <div className="h-2" />
      </SkMain>
    </div>
  );
}
