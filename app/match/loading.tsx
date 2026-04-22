import { SkBlock } from "@/components/loading/skeleton-primitives";
import { MatchPageShell } from "@/components/match/match-page-shell";

/** Skeleton alinhado ao shell atual do Match (ranking + perfil). */
export default function LoadingMatchPage() {
  return (
    <MatchPageShell>
      <SkBlock className="mb-3 h-14 w-48 max-w-[85%] rounded-lg" />
      <SkBlock className="mb-1 h-9 w-40 rounded-md" />
      <SkBlock className="mb-4 h-10 w-full max-w-md rounded-lg" />
      <SkBlock className="mb-3 h-[4.25rem] w-full rounded-2xl" />
      <div className="mb-3 flex gap-1 rounded-2xl border border-[color:var(--eid-border-subtle)]/50 p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkBlock key={i} className="h-9 flex-1 rounded-md" />
        ))}
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <SkBlock className="h-28 rounded-2xl" />
        <SkBlock className="h-28 rounded-2xl" />
      </div>
      <SkBlock className="mb-4 h-20 rounded-2xl" />
      <section className="grid gap-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkBlock key={idx} className="h-[7.5rem] rounded-2xl" />
        ))}
      </section>
    </MatchPageShell>
  );
}
