import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingDashboard() {
  return (
    <div data-eid-dashboard-page>
    <SkMain
      variant="narrow"
      className="relative z-0 min-w-0 px-3 py-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:py-0 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <div className={`eid-dashboard-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <SkBlock className="h-[4.25rem] w-[4.25rem] rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
            <SkBlock className="h-5 w-12 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <SkBlock className="h-3 w-16 rounded-md" />
            <SkBlock className="mt-2 h-6 w-40 rounded-lg sm:h-7 sm:w-48" />
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
      </div>

      <nav
        aria-label="Carregando atalhos"
        className="eid-dashboard-app-nav mt-4 rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] bg-[color-mix(in_srgb,var(--eid-surface)_42%,var(--eid-bg)_58%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_-18px_rgba(15,23,42,0.35)] sm:mt-5 sm:rounded-[1.35rem] sm:p-1.5"
      >
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 sm:min-h-[4.35rem] sm:py-2"
            >
              <SkBlock className="h-10 w-10 rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl" />
              <SkBlock className="h-2.5 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </nav>

      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <section
          key={sectionIdx}
          className="eid-dashboard-section mt-6 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] sm:mt-8"
        >
          <div className="eid-dashboard-section-head flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <SkBlock className="h-3 w-28 rounded-md" />
            <SkBlock className="h-5 w-16 rounded-full" />
          </div>
          <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
            <SkBlock className="mb-3 h-3 w-full max-w-md rounded-md" />
            {sectionIdx === 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 3 }).map((__, idx) => (
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
              <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 pb-1 sm:-mx-4 sm:gap-3 sm:px-4">
                {Array.from({ length: 4 }).map((__, idx) => (
                  <SkBlock key={idx} className="h-32 w-[120px] shrink-0 rounded-2xl" />
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
      <div className="h-1" />
    </SkMain>
    </div>
  );
}
