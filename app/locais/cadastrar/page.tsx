import { EidStreamSection } from "@/components/eid-stream-section";
import { LocaisCadastrarStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { CadastrarLocalStream, type CadastrarLocalStreamProps } from "./cadastrar-local-stream";

export const metadata = {
  title: "Cadastrar local",
  description: "Sugerir um espaço esportivo na comunidade EsporteID",
};

export default function CadastrarLocalPage({ searchParams }: CadastrarLocalStreamProps) {
  return (
    <EidStreamSection fallback={<LocaisCadastrarStreamSkeleton />}>
      <CadastrarLocalStream searchParams={searchParams} />
    </EidStreamSection>
  );
}
