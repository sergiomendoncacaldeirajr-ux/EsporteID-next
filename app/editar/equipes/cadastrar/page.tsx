import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { CadastrarEquipeSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { CadastrarEquipeStream } from "./cadastrar-equipe-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string; convidar?: string; esporte?: string; tipo?: string }>;
};

export default async function CadastrarEquipeFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/equipes/cadastrar")}`);

  return (
    <EidStreamSection fallback={<CadastrarEquipeSkeleton />}>
      <CadastrarEquipeStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
