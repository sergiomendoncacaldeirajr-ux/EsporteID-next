import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Perfil público — capa, avatar, chips e colunas (EID + lateral). */
export default function LoadingPerfilPublico() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-8 w-28 rounded-lg" />
      <SkBlock className="mt-4 h-36 w-full rounded-2xl sm:h-44" />
      <div className="-mt-10 flex flex-col items-center gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:gap-6">
        <SkBlock className="h-28 w-28 shrink-0 rounded-full ring-4 ring-eid-bg sm:h-32 sm:w-32" />
        <div className="w-full min-w-0 flex-1 space-y-2 pb-1 text-center sm:pb-3 sm:text-left">
          <SkBlock className="mx-auto h-8 w-52 max-w-full rounded-md sm:mx-0" />
          <SkBlock className="mx-auto h-4 w-40 rounded-md sm:mx-0" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkBlock key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          <SkBlock className="h-52 rounded-2xl" />
          <SkBlock className="h-32 rounded-2xl" />
        </div>
      </div>
    </SkMain>
  );
}
