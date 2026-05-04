import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilEidEsporteSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilTimeEidEsporteStream, type PerfilTimeEidStreamProps } from "./perfil-time-eid-stream";

export default function PerfilTimeEidEsportePage(props: PerfilTimeEidStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilEidEsporteSkeleton />}>
      <PerfilTimeEidEsporteStream {...props} />
    </EidStreamSection>
  );
}
