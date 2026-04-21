import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingProfessorAlunos() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SkBlock className="h-10 w-full max-w-xs rounded-xl" />
        <SkBlock className="h-10 w-32 rounded-xl" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkBlock key={i} className="h-[4.5rem] rounded-2xl" />
      ))}
    </div>
  );
}
