import { SkBlock } from "@/components/loading/skeleton-primitives";
import { rankingCardHeadWrapClass, rankingCardShellClass } from "@/app/ranking/ranking-layout-classes";

export function RankingStreamBodySkeleton() {
  return (
    <div className="space-y-4 md:space-y-6" aria-hidden>
      <section>
        <div className="overflow-hidden rounded-2xl border border-transparent bg-eid-surface/35 p-4">
          <div className="flex justify-center gap-2 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <SkBlock className="h-16 w-14 rounded-xl sm:h-24 sm:w-20" />
                <SkBlock className="h-2.5 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className={rankingCardShellClass}>
          <div className={rankingCardHeadWrapClass}>
            <SkBlock className="h-3 w-32 rounded-md" />
            <SkBlock className="h-5 w-24 rounded-full" />
          </div>
          <div className="space-y-2 px-2.5 py-3 sm:px-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkBlock key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
