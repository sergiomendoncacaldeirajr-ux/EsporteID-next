import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilEidEsporteSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilEidEsporteStream, type PerfilEidEsporteStreamProps } from "./perfil-eid-esporte-stream";

export default function PerfilEidEsportePage(props: PerfilEidEsporteStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilEidEsporteSkeleton />}>
      <PerfilEidEsporteStream {...props} />
    </EidStreamSection>
  );
}
