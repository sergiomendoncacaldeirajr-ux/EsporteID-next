import { EidStreamSection } from "@/components/eid-stream-section";
import { FormacaoEidDetailsStreamSkeleton, FormacaoEidHeroStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { PerfilDuplaEidDetailsStream } from "./perfil-dupla-eid-details-stream";
import { PerfilDuplaEidHeroStream } from "./perfil-dupla-eid-hero-stream";
import type { PerfilDuplaEidRouteInput } from "./perfil-dupla-eid-session";

export default function PerfilDuplaEidEsportePage(props: PerfilDuplaEidRouteInput) {
  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
      <EidStreamSection fallback={<FormacaoEidHeroStreamSkeleton />}>
        <PerfilDuplaEidHeroStream {...props} />
      </EidStreamSection>
      <EidStreamSection fallback={<FormacaoEidDetailsStreamSkeleton />}>
        <PerfilDuplaEidDetailsStream {...props} />
      </EidStreamSection>
    </main>
  );
}
