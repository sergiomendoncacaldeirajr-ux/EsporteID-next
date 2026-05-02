import { SkBlock } from "@/components/loading/skeleton-primitives";
import { MatchPageShell } from "@/components/match/match-page-shell";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

/** Skeleton alinhado ao shell refinado do Match (hero + filtros + resultados). */
export default function LoadingMatchPage() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <MatchPageShell>
      <div
        className={`eid-match-hero relative mb-3 mt-0 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}
      >
        <SkBlock className="h-2.5 w-28 rounded-full" />
        <SkBlock className="mt-2 h-7 w-36 rounded-lg" />
        <SkBlock className="mt-2 h-8 w-full max-w-md rounded-md" />
      </div>

      <div className="eid-match-filter-card overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
        <div className="eid-match-section-head flex items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 sm:px-4">
          <SkBlock className="h-3 w-32 rounded-md" />
          <SkBlock className="h-5 w-14 rounded-full" />
        </div>
        <div className="space-y-2 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <SkBlock className="h-[1.5rem] w-full rounded-md" />
          <SkBlock className="h-[1.5rem] w-full rounded-md" />
          <SkBlock className="h-16 w-full rounded-lg" />
          <SkBlock className="h-12 w-full rounded-lg" />
        </div>
      </div>

      <div className="eid-match-results-card mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]">
        <div className="eid-match-section-head flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 sm:px-4">
          <SkBlock className="h-3 w-24 rounded-md" />
          <SkBlock className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 px-2 pb-3 pt-2 sm:gap-3 sm:px-3 sm:pb-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkBlock key={idx} className="h-[7.5rem] rounded-2xl" />
          ))}
        </div>
      </div>
    </MatchPageShell>
  );
}
