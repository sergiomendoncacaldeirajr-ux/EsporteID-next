import { SkBlock } from "@/components/loading/skeleton-primitives";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingEspacoPublicPage() {
  if (eidRouteSkeletonsDisabled()) return null;

  return (
    <main className={PROFILE_PUBLIC_MAIN_WIDE_CLASS} aria-hidden>
      <section className={`${PROFILE_HERO_PANEL_CLASS} mt-2 border border-eid-primary-500/25 p-4 sm:p-5`}>
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <SkBlock className="h-3 w-40 rounded-md" />
            <SkBlock className="h-8 w-[min(82%,24rem)] rounded-xl" />
            <SkBlock className="h-4 w-full rounded-md" />
            <SkBlock className="h-4 w-[78%] rounded-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <SkBlock className="h-8 w-28 rounded-full" />
              <SkBlock className="h-8 w-32 rounded-full" />
            </div>
            <div className="space-y-2 pt-1">
              <SkBlock className="h-3 w-[70%] rounded-md" />
              <SkBlock className="h-3 w-44 rounded-md" />
            </div>
          </div>
          <div className={`${PROFILE_CARD_BASE} p-3 sm:p-4`}>
            <SkBlock className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <SkBlock className="h-3 w-28 rounded-md" />
            <div className="mt-4 space-y-2">
              <SkBlock className="h-16 w-full rounded-xl" />
              <SkBlock className="h-16 w-full rounded-xl" />
              <SkBlock className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <SkBlock className="h-3 w-36 rounded-md" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                <SkBlock className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkBlock className="h-3 w-36 rounded-md" />
                  <SkBlock className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <SkBlock className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
