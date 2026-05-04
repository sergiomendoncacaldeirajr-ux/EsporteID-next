import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilHistoricoListaSkeleton } from "@/components/loading/profile-app-skeletons";
import {
  PerfilTimeHistoricoCompletoStream,
  type PerfilTimeHistoricoCompletoStreamProps,
} from "./perfil-time-historico-completo-stream";

export default function PerfilTimeHistoricoCompletoPage(props: PerfilTimeHistoricoCompletoStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilHistoricoListaSkeleton variant="perfil" />}>
      <PerfilTimeHistoricoCompletoStream {...props} />
    </EidStreamSection>
  );
}
