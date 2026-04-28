import { redirect } from "next/navigation";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { createClient } from "@/lib/supabase/server";

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

  const { data: minhas } = await supabase
    .from("times")
    .select("id, nome, tipo, esportes(nome)")
    .eq("criador_id", user.id)
    .order("id", { ascending: false })
    .limit(20);

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;
  const isEmbed = sp.embed === "1";

  const cadastrarQs = new URLSearchParams();
  cadastrarQs.set("from", from);
  cadastrarQs.set("embed", "1");
  const cadastrarHref = `/editar/equipes/cadastrar?${cadastrarQs.toString()}`;

  if ((minhas ?? []).length === 0) {
    return (
      <ProfileEditFullscreenShell
        backHref={from}
        title="Convidar atleta"
        subtitle="Você precisa de uma dupla ou time cadastrado para enviar convites pelo @."
        showBack={!isEmbed}
      >
        <p className="text-sm text-eid-text-secondary">
          Cadastre uma formação primeiro; em seguida volte aqui para convidar atletas pelo nome de usuário.
        </p>
        <ProfileEditDrawerTrigger
          href={cadastrarHref}
          title="Cadastrar formação"
          fullscreen
          topMode="backOnly"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-4 text-xs font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/60"
        >
          <span>Cadastrar dupla ou time</span>
        </ProfileEditDrawerTrigger>
      </ProfileEditFullscreenShell>
    );
  }

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Convidar atleta"
      subtitle="Escolha sua formação e informe o @ do atleta. O convite aparece no Social dele."
      showBack={!isEmbed}
    >
      <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Convite por @username</p>
          <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-300">
            Elenco
          </span>
        </div>
        <div className="p-3">
          <TeamManagementPanel
            esportes={[]}
            minhasEquipes={(minhas ?? []).map((t) => {
              const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
              return { id: t.id, nome: t.nome ?? "Equipe", tipo: t.tipo ?? "time", esporteNome: esp?.nome ?? "Esporte" };
            })}
            panelMode="invite"
          />
        </div>
      </section>
    </ProfileEditFullscreenShell>
  );
}
