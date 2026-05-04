import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilEidEsporteSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilDuplaEidEsporteStream, type PerfilDuplaEidStreamProps } from "./perfil-dupla-eid-stream";

export default function PerfilDuplaEidEsportePage(props: PerfilDuplaEidStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilEidEsporteSkeleton />}>
      <PerfilDuplaEidEsporteStream {...props} />
    </EidStreamSection>
  );
}
