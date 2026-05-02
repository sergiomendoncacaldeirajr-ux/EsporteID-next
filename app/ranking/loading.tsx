import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { SkBlock } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingRanking() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <div className="relative flex w-full min-w-0 flex-col" data-eid-ranking-page>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 max-h-[24rem] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)] sm:h-64"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
        <div className={`eid-ranking-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
          <SkBlock className="h-3 w-24 rounded-md" />
          <SkBlock className="mt-2 h-6 w-4/5 max-w-[14rem] rounded-md" />
          <SkBlock className="mt-2 h-3 w-full max-w-md rounded-md" />
        </div>

        <section className="mt-4 md:mt-6">
          <div className="eid-ranking-card overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
            <div className="eid-ranking-card-head flex items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <SkBlock className="h-3 w-16 rounded-md" />
              <SkBlock className="h-5 w-14 rounded-full" />
            </div>
            <div className="space-y-2 p-2.5 sm:p-3">
              <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
                <SkBlock className="h-[1.5rem] w-full rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
                <SkBlock className="h-[1.38rem] rounded-md" />
                <SkBlock className="h-[1.38rem] rounded-md" />
              </div>
              <div className="rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden pb-0.5 pr-0.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <SkBlock key={i} className="h-[1.38rem] w-16 shrink-0 rounded-md" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-4 md:mt-6">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-2.5 py-3 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.38)]">
            <div className="mb-2 flex items-center justify-between gap-1.5">
              <SkBlock className="h-5 w-20 rounded-full" />
              <SkBlock className="h-5 w-20 rounded-full" />
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

        <section className="mt-4 md:mt-6">
          <div className="eid-ranking-card overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
            <div className="eid-ranking-card-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <SkBlock className="h-3 w-24 rounded-md" />
              <SkBlock className="h-5 w-28 rounded-full" />
            </div>
            <div className="px-2.5 sm:px-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2 border-b border-[color:var(--eid-border-subtle)] py-1.5 last:border-b-0">
                  <SkBlock className="h-5 w-7 rounded-md" />
                  <SkBlock className="h-9 w-9 rounded-full" />
                  <SkBlock className="h-3.5 flex-1 rounded-md" />
                  <SkBlock className="h-4 w-10 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
