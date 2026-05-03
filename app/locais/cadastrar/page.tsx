import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { LocaisCadastrarStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { usuarioJaGerenciaEspaco } from "@/lib/espacos/server";
import { createClient } from "@/lib/supabase/server";
import { CadastrarLocalStream } from "./cadastrar-local-stream";

export const metadata = {
  title: "Cadastrar local",
  description: "Sugerir um espaço esportivo na comunidade EsporteID",
};

export default async function CadastrarLocalPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string; id?: string; return_to?: string; from?: string; sucesso?: string; novo_local_nome?: string }>;
}) {
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais/cadastrar");
  if (await usuarioJaGerenciaEspaco(user.id)) {
    redirect("/espaco");
  }

  return (
    <EidStreamSection fallback={<LocaisCadastrarStreamSkeleton />}>
      <CadastrarLocalStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
