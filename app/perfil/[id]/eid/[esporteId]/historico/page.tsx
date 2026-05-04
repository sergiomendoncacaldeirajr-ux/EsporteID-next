import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilHistoricoListaSkeleton } from "@/components/loading/profile-app-skeletons";
import {
  PerfilEidEsporteHistoricoStream,
  type PerfilEidHistoricoStreamProps,
} from "./perfil-eid-historico-stream";

export default function PerfilEidEsporteHistoricoIndividualPage(props: PerfilEidHistoricoStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilHistoricoListaSkeleton variant="eid" />}>
      <PerfilEidEsporteHistoricoStream {...props} />
    </EidStreamSection>
  );
}
