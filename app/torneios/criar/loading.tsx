import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

/** Formulário longo de criação de torneio. */
export default function LoadingCriarTorneio() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-8 w-48 rounded-lg" />
      <SkBlock className="mt-2 h-4 w-full max-w-2xl rounded-md" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkBlock key={i} className={`rounded-xl ${i % 3 === 0 ? "h-12" : "h-24"}`} />
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <SkBlock className="h-12 w-36 rounded-xl" />
        <SkBlock className="h-12 w-36 rounded-xl" />
      </div>
    </SkMain>
  );
}
