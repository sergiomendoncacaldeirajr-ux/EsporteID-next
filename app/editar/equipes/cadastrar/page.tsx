import { redirect } from "next/navigation";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function CadastrarEquipeFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/equipes/cadastrar")}`);

  const [{ data: esportes }, { data: minhas }] = await Promise.all([
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
    supabase
      .from("times")
      .select("id, nome, tipo, esportes(nome)")
      .eq("criador_id", user.id)
      .order("id", { ascending: false })
      .limit(20),
  ]);

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;
  const isEmbed = sp.embed === "1";

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Cadastrar equipe ou dupla"
      subtitle="Crie uma nova formação no padrão do perfil."
      showBack={!isEmbed}
    >
      <TeamManagementPanel
        esportes={(esportes ?? []).map((e) => ({ id: e.id, nome: e.nome }))}
        minhasEquipes={(minhas ?? []).map((t) => {
          const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
          return { id: t.id, nome: t.nome ?? "Equipe", tipo: t.tipo ?? "time", esporteNome: esp?.nome ?? "Esporte" };
        })}
        defaultOpenCreate
        manageHrefTemplate={`/editar/time/:id?from=${encodeURIComponent(from)}${isEmbed ? "&embed=1" : ""}`}
      />
    </ProfileEditFullscreenShell>
  );
}

