import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilEidEsporteSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilEidEsporteStream, type PerfilEidEsporteStreamProps } from "./perfil-eid-esporte-stream";

export default function PerfilEidEsportePage(props: PerfilEidEsporteStreamProps) {
  return (
    <div data-eid-profile-eid-page data-eid-touch-ui className="eid-profile-eid-native-shell">
      <EidStreamSection fallback={<PerfilEidEsporteSkeleton />}>
        <PerfilEidEsporteStream {...props} />
      </EidStreamSection>
    </div>
  );
}
