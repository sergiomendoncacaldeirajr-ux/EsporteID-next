import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilHistoricoListaSkeleton } from "@/components/loading/profile-app-skeletons";
import {
  PerfilDuplaHistoricoCompletoStream,
  type PerfilDuplaHistoricoCompletoStreamProps,
} from "./perfil-dupla-historico-completo-stream";

export default function PerfilDuplaHistoricoCompletoPage(props: PerfilDuplaHistoricoCompletoStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilHistoricoListaSkeleton variant="perfil" />}>
      <PerfilDuplaHistoricoCompletoStream {...props} />
    </EidStreamSection>
  );
}
