import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingProfessorLocais() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkBlock key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}
