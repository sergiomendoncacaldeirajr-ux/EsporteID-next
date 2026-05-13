import { EidStreamSection } from "@/components/eid-stream-section";
import { FormacaoEidDetailsStreamSkeleton, FormacaoEidHeroStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { PerfilTimeEidDetailsStream } from "./perfil-time-eid-details-stream";
import { PerfilTimeEidHeroStream } from "./perfil-time-eid-hero-stream";
import type { PerfilTimeEidRouteInput } from "./perfil-time-eid-session";

export default function PerfilTimeEidEsportePage(props: PerfilTimeEidRouteInput) {
  return (
    <main data-eid-profile-eid-page data-eid-touch-ui className={`${PROFILE_PUBLIC_MAIN_CLASS} eid-profile-eid-native-shell`}>
      <EidStreamSection fallback={<FormacaoEidHeroStreamSkeleton />}>
        <PerfilTimeEidHeroStream {...props} />
      </EidStreamSection>
      <EidStreamSection fallback={<FormacaoEidDetailsStreamSkeleton />}>
        <PerfilTimeEidDetailsStream {...props} />
      </EidStreamSection>
    </main>
  );
}
