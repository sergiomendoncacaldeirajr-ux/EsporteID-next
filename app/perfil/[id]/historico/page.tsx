import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilHistoricoListaSkeleton } from "@/components/loading/profile-app-skeletons";
import {
  PerfilHistoricoCompletoStream,
  type PerfilHistoricoCompletoStreamProps,
} from "./perfil-historico-completo-stream";

export default function PerfilHistoricoCompletoPage(props: PerfilHistoricoCompletoStreamProps) {
  return (
    <EidStreamSection fallback={<PerfilHistoricoListaSkeleton variant="perfil" />}>
      <PerfilHistoricoCompletoStream {...props} />
    </EidStreamSection>
  );
}
