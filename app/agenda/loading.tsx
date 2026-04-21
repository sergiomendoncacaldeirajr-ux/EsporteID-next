import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Cartão “Agenda” + faixa de conexões + lista de partidas. */
export default function LoadingAgenda() {
  return (
    <SkMain variant="narrow">
      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 md:rounded-3xl md:p-6">
        <SkBlock className="h-7 w-36 rounded-lg md:h-8 md:w-44" />
        <SkBlock className="mt-3 hidden h-4 w-full max-w-md rounded-md md:block" />
        <div className="mt-3 grid grid-cols-3 gap-1.5 md:mt-5 md:gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkBlock key={i} className="h-16 rounded-lg md:h-[4.25rem] md:rounded-2xl" />
          ))}
        </div>
        <SkBlock className="mt-3 h-11 w-full rounded-lg md:mt-5 md:h-[50px] md:rounded-2xl" />
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden md:mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkBlock key={i} className="h-14 w-14 shrink-0 rounded-full md:h-16 md:w-16" />
        ))}
      </div>
      <SkBlock className="mt-6 h-4 w-40 rounded-md" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-[5.5rem] rounded-2xl md:h-28" />
        ))}
      </div>
    </SkMain>
  );
}
