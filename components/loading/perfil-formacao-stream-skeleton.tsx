import { SkBlock } from "@/components/loading/skeleton-primitives";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";

/** Fallback do stream em `/perfil-dupla/[id]` e `/perfil-time/[id]` (hero + blocos principais). */
export function PerfilFormacaoStreamSkeleton() {
  return (
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
      <div className={`${PROFILE_HERO_PANEL_CLASS} relative mt-2 p-3 sm:p-4`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <SkBlock className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
          <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
            <SkBlock className="h-6 w-44 rounded-full" />
            <SkBlock className="h-8 w-56 max-w-full rounded-lg" />
            <SkBlock className="h-4 w-full max-w-xs rounded" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <SkBlock className="mx-auto mt-4 h-14 w-full max-w-md rounded-xl" />
      </div>
      <div className="mt-6 grid gap-6" aria-hidden>
        <SkBlock className="h-36 w-full rounded-xl" />
        <SkBlock className="h-44 w-full rounded-xl" />
        <SkBlock className="h-40 w-full rounded-xl" />
        <SkBlock className="h-52 w-full rounded-xl" />
      </div>
    </main>
  );
}
