import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { CadastrarEquipeSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { ConvidarEquipeStream } from "./convidar-equipe-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function ConvidarAtletaEquipePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/equipes/convidar")}`);

  return (
    <EidStreamSection fallback={<CadastrarEquipeSkeleton />}>
      <ConvidarEquipeStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
