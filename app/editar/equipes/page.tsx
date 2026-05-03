import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarEquipesSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarEquipesStream } from "./equipes-edit-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarEquipesFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/equipes")}`);

  return (
    <EidStreamSection fallback={<EditarEquipesSkeleton />}>
      <EditarEquipesStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
