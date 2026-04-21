import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Espelha o painel: título, busca, atalhos e grade de cards. */
export default function LoadingDashboard() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-12 w-48 rounded-xl" />
      <SkBlock className="mt-6 h-12 w-full rounded-xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkBlock key={idx} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkBlock key={idx} className="h-28 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
