import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";

export default function LoadingDesafio() {
  return (
    <SkMain variant="wide5">
      <SkBlock className="h-10 w-48 rounded-xl" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SkBlock className="min-h-[240px] rounded-2xl" />
        <div className="space-y-3">
          <SkBlock className="h-8 w-3/4 rounded-lg" />
          <SkBlock className="h-4 w-full rounded-md" />
          <SkBlock className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </SkMain>
  );
}
