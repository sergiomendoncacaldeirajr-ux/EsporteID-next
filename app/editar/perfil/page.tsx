import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfileMainEditor } from "@/components/perfil/edit/profile-main-editor";
import { ProfileMediaEditor } from "@/components/perfil/edit/profile-media-editor";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome, username, localizacao, avatar_url, foto_capa, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, perfil_completo, termos_aceitos_em"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/editar/perfil")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = listarPapeis(papeisRows);
  const { count: athleteSportsCount } = await supabase
    .from("usuario_eid")
    .select("esporte_id", { count: "exact", head: true })
    .eq("usuario_id", user.id);
  const hasAthleteSports = (athleteSportsCount ?? 0) > 0;
  void papeis;
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${user.id}`;
  const isEmbed = sp.embed === "1";

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar perfil"
      subtitle="Dados pessoais públicos. Alterações entram em vigor após salvar."
      showBack={!isEmbed}
    >
      {hasAthleteSports ? (
        <p className="eid-list-item mb-3 rounded-xl border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-text-secondary">
          Para esportes do ranking, interesse no match e modalidades (individual/dupla/time), use{" "}
          <Link href={`/editar/performance-eid?from=${encodeURIComponent(from)}`} className="font-semibold text-eid-primary-300 underline">
            Esportes e EID
          </Link>
          .
        </p>
      ) : null}
      <div className="space-y-3">
        <ProfileMediaEditor avatarUrl={profile.avatar_url ?? null} coverUrl={profile.foto_capa ?? null} />
        <ProfileMainEditor
          initial={{
            nome: profile.nome ?? "",
            username: profile.username ?? "",
            localizacao: profile.localizacao ?? "",
            alturaCm: profile.altura_cm ?? null,
            pesoKg: profile.peso_kg ?? null,
            lado: profile.lado ?? null,
            bio: profile.bio ?? "",
            estiloJogo: profile.estilo_jogo ?? "",
          }}
        />
      </div>
    </ProfileEditFullscreenShell>
  );
}

