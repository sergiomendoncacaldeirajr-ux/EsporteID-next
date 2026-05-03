import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarPerformanceEidSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarPerformanceEidStream } from "./performance-eid-stream";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarPerformanceEidFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/performance-eid")}`);

  async function ativarModoAtletaAction() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) redirect("/login?next=%2Feditar%2Fperformance-eid");
    await sb
      .from("usuario_papeis")
      .upsert(
        {
          usuario_id: actionUser.id,
          papel: "atleta",
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,papel" }
      );
    revalidatePath("/editar/performance-eid");
    redirect("/editar/performance-eid");
  }

  return (
    <EidStreamSection fallback={<EditarPerformanceEidSkeleton />}>
      <EditarPerformanceEidStream viewerId={user.id} sp={sp} ativarModoAtletaAction={ativarModoAtletaAction} />
    </EidStreamSection>
  );
}
