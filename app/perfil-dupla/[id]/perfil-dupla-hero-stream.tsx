import { Suspense } from "react";
import {
  PerfilFormacaoHeroIdentitySkeleton,
  PerfilFormacaoHeroLeaderRowSkeleton,
  PerfilFormacaoHeroStatsRowSkeleton,
} from "@/components/loading/perfil-formacao-stream-skeleton";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { PerfilDuplaHeroIdentity } from "./perfil-dupla-hero-identity";
import { PerfilDuplaHeroWinStats } from "./perfil-dupla-hero-win-stats";

export type PerfilDuplaHeroStreamProps = {
  duplaId: number;
  viewerId: string;
};

function DuplaHeroIdentityFallback() {
  return (
    <div className="space-y-4">
      <PerfilFormacaoHeroIdentitySkeleton />
      <PerfilFormacaoHeroLeaderRowSkeleton />
    </div>
  );
}

export function PerfilDuplaHeroStream({ duplaId, viewerId }: PerfilDuplaHeroStreamProps) {
  return (
    <div className={`${PROFILE_HERO_PANEL_CLASS} relative mt-2 p-3 sm:p-4`}>
      <Suspense fallback={<DuplaHeroIdentityFallback />}>
        <PerfilDuplaHeroIdentity duplaId={duplaId} viewerId={viewerId} />
      </Suspense>
      <Suspense fallback={<PerfilFormacaoHeroStatsRowSkeleton />}>
        <PerfilDuplaHeroWinStats duplaId={duplaId} viewerId={viewerId} />
      </Suspense>
    </div>
  );
}
