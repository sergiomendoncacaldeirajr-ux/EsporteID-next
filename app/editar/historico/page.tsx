import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarHistoricoSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarHistoricoStream } from "./historico-edit-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarHistoricoFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/historico")}`);

  return (
    <EidStreamSection fallback={<EditarHistoricoSkeleton />}>
      <EditarHistoricoStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
