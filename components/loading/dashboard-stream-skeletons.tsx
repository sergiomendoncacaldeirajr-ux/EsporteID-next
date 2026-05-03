import { SkBlock } from "@/components/loading/skeleton-primitives";
import {
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
} from "@/app/dashboard/dashboard-layout-classes";

export function DashboardStreamRadarSkeleton() {
  return (
    <div className="space-y-0" aria-hidden>
      <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
        <div className={dashboardSectionHead}>
          <SkBlock className="h-3 w-36 rounded-md" />
          <SkBlock className="h-5 w-20 rounded-full" />
        </div>
        <div className={dashboardSectionBody}>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-transparent bg-eid-surface/35 px-2 py-2">
                <SkBlock className="mx-auto h-3 w-12 rounded-md" />
                <SkBlock className="mx-auto mt-2 h-12 w-12 rounded-full" />
                <SkBlock className="mx-auto mt-2 h-2.5 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
        <div className={dashboardSectionHead}>
          <SkBlock className="h-3 w-40 rounded-md" />
          <SkBlock className="h-5 w-20 rounded-full" />
        </div>
        <div className={dashboardSectionBody}>
          <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 sm:-mx-4 sm:gap-3 sm:px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBlock key={i} className="h-28 w-[124px] shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function DashboardStreamTorneiosSkeleton() {
  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`} aria-hidden>
      <div className={dashboardSectionHead}>
        <SkBlock className="h-3 w-44 rounded-md" />
        <SkBlock className="h-5 w-20 rounded-full" />
      </div>
      <div className={dashboardSectionBody}>
        <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 sm:-mx-4 sm:gap-3 sm:px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-40 w-[220px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardStreamLocaisSkeleton() {
  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`} aria-hidden>
      <div className={dashboardSectionHead}>
        <SkBlock className="h-3 w-40 rounded-md" />
        <SkBlock className="h-5 w-20 rounded-full" />
      </div>
      <div className={dashboardSectionBody}>
        <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 sm:-mx-4 sm:gap-3 sm:px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkBlock key={i} className="h-36 w-[148px] shrink-0 rounded-2xl" />
          ))}
        </div>
        <SkBlock className="mt-4 h-12 w-full rounded-xl" />
        <SkBlock className="mx-auto mt-2 h-3 w-full max-w-md rounded-md" />
      </div>
    </section>
  );
}
