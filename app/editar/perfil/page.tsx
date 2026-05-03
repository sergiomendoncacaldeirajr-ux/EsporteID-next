import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarPerfilSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarPerfilStream } from "./perfil-edit-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarPerfilFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/perfil")}`);

  return (
    <EidStreamSection fallback={<EditarPerfilSkeleton />}>
      <EditarPerfilStream viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
