import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingMinhasAulas() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-9 w-56 rounded-xl" />
      <SkBlock className="mt-2 h-4 max-w-lg rounded-md" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkBlock key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </SkMain>
  );
}
