import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { createClient } from "@/lib/supabase/server";
import { PerfilTimeBodyStream } from "./perfil-time-body-stream";
import { PerfilTimeHeroStream } from "./perfil-time-hero-stream";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilTimePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil-time/${id}`, sp));

  async function sairEquipeAction() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) return;
    await sb.rpc("sair_da_equipe", { p_time_id: id });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath(`/perfil/${actionUser.id}`);
  }

  async function removerMembroAction(formData: FormData) {
    "use server";
    const sb = await createClient();
    const uid = String(formData.get("usuario_id") ?? "");
    if (!uid) return;
    await sb.rpc("remover_membro_time", { p_time_id: id, p_usuario_id: uid });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath(`/perfil/${uid}`);
  }

  return (
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
      <PerfilTimeHeroStream timeId={id} viewerId={user.id} sairEquipeAction={sairEquipeAction} />
      <PerfilTimeBodyStream timeId={id} viewerId={user.id} removerMembroAction={removerMembroAction} />
    </main>
  );
}
