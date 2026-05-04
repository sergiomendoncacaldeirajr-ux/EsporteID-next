import { Suspense } from "react";
import {
  PerfilFormacaoHeroIdentitySkeleton,
  PerfilFormacaoHeroLeaderRowSkeleton,
  PerfilFormacaoHeroStatsRowSkeleton,
} from "@/components/loading/perfil-formacao-stream-skeleton";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { PerfilTimeHeroIdentity } from "./perfil-time-hero-identity";
import { PerfilTimeHeroWinStats } from "./perfil-time-hero-win-stats";

export type PerfilTimeHeroStreamProps = {
  timeId: number;
  viewerId: string;
  sairEquipeAction: () => Promise<void>;
};

function PerfilTimeHeroIdentityFallback() {
  return (
    <div className="space-y-4">
      <PerfilFormacaoHeroIdentitySkeleton />
      <PerfilFormacaoHeroLeaderRowSkeleton />
    </div>
  );
}

export function PerfilTimeHeroStream({ timeId, viewerId, sairEquipeAction }: PerfilTimeHeroStreamProps) {
  return (
    <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 sm:p-4`}>
      <Suspense fallback={<PerfilTimeHeroIdentityFallback />}>
        <PerfilTimeHeroIdentity timeId={timeId} viewerId={viewerId} sairEquipeAction={sairEquipeAction} />
      </Suspense>
      <Suspense fallback={<PerfilFormacaoHeroStatsRowSkeleton />}>
        <PerfilTimeHeroWinStats timeId={timeId} viewerId={viewerId} />
      </Suspense>
    </div>
  );
}
