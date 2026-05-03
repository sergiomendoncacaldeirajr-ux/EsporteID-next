import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { createClient } from "@/lib/supabase/server";

export type CadastrarEquipeStreamProps = {
  viewerId: string;
  sp: { from?: string; embed?: string; convidar?: string; esporte?: string; tipo?: string };
};

export async function CadastrarEquipeStream({ viewerId, sp }: CadastrarEquipeStreamProps) {
  const supabase = await createClient();

  const [{ data: esportes }, { data: minhas }] = await Promise.all([
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
    supabase
      .from("times")
      .select("id, nome, tipo, esportes(nome)")
      .eq("criador_id", viewerId)
      .order("id", { ascending: false })
      .limit(20),
  ]);

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;
  const isEmbed = sp.embed === "1";
  const convidarRaw = typeof sp.convidar === "string" ? sp.convidar.trim() : "";
  const convidarUid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convidarRaw) ? convidarRaw : undefined;

  const esportePref = Number(typeof sp.esporte === "string" ? sp.esporte : "");
  const tipoParam = typeof sp.tipo === "string" ? sp.tipo.trim().toLowerCase() : "";
  const tipoFromUrl = tipoParam === "dupla" || tipoParam === "time" ? tipoParam : undefined;
  const defaultEsporteId = Number.isFinite(esportePref) && esportePref > 0 ? esportePref : undefined;

  const manageQs = new URLSearchParams();
  manageQs.set("from", from);
  if (isEmbed) manageQs.set("embed", "1");
  if (convidarUid) manageQs.set("convidar", convidarUid);
  const manageHrefTemplate = `/editar/time/:id?${manageQs.toString()}`;

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title={convidarUid ? "Nova dupla ou time" : "Cadastrar equipe ou dupla"}
      subtitle={convidarUid ? "Preencha abaixo — ao criar, o convite é enviado ao atleta." : "Crie uma nova formação no padrão do perfil."}
      showBack={false}
      hideHeader
    >
      <section className="mb-4">
        <div className="overflow-hidden rounded-[24px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_84%,var(--eid-primary-500)_16%)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_97%,white_3%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">
                {convidarUid ? "Cadastrar dupla ou time" : "Cadastrar equipe ou dupla"}
              </h1>
              <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:mt-3 sm:text-[17px]">
                {convidarUid ? "Crie uma nova formação no padrão do perfil e envie o convite automaticamente." : "Crie uma nova formação no padrão do perfil."}
              </p>
            </div>
            <div className="justify-self-end" aria-hidden>
              <svg viewBox="0 0 180 150" className="h-[84px] w-[84px] drop-shadow-[0_12px_18px_rgba(37,99,235,0.26)] sm:h-[136px] sm:w-[136px]">
                <circle cx="74" cy="44" r="21" fill="#2563EB" />
                <circle cx="108" cy="37" r="24" fill="#1D4ED8" />
                <circle cx="143" cy="51" r="20" fill="#3B82F6" />
                <path d="M54 98c4-16 14-26 27-26s23 10 27 26" fill="#2563EB" />
                <path d="M84 97c4-19 17-31 33-31s28 12 33 31" fill="#1D4ED8" />
                <path d="M121 101c3-14 12-23 22-23s19 9 22 23" fill="#3B82F6" />
                <path d="m104 62 33 6-7 45-30 8-24-21 5-33z" fill="#F8FAFC" />
                <path d="M106 74c5-2 9 0 10 4 1 4-2 7-6 8-4 1-7 4-5 9l-6-1c-2-7 2-13 7-15Z" fill="#2563EB" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <TeamManagementPanel
        esportes={(esportes ?? []).map((e) => ({ id: e.id, nome: e.nome }))}
        minhasEquipes={(minhas ?? []).map((t) => {
          const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
          return { id: t.id, nome: t.nome ?? "Equipe", tipo: t.tipo ?? "time", esporteNome: esp?.nome ?? "Esporte" };
        })}
        defaultOpenCreate
        manageHrefTemplate={manageHrefTemplate}
        convidarUsuarioIdAposCriar={convidarUid}
        defaultTipoFormacao={tipoFromUrl ?? (convidarUid ? "dupla" : undefined)}
        defaultEsporteId={defaultEsporteId}
        panelMode="create"
        createStyle="cadastrar"
      />
    </ProfileEditFullscreenShell>
  );
}

