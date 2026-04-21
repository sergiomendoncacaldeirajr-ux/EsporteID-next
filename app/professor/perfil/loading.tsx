import { SkBlock } from "@/components/loading/skeleton-primitives";

export default function LoadingProfessorPerfil() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <SkBlock className="h-6 w-48 rounded-md" />
          <SkBlock className="mt-4 h-11 w-full rounded-xl" />
          <SkBlock className="mt-3 h-24 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
