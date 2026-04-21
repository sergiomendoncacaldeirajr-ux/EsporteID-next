import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingProfessorAvaliacoes() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkBlock key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}
