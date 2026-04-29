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
        showBack={false}
        hideHeader
      >
        <section className="eid-surface-panel overflow-hidden rounded-[24px] p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="9" cy="8.2" r="2.8" />
                <path d="M3.6 18.2a5.4 5.4 0 0 1 10.8 0" />
                <path d="M17.8 7.2v4M15.8 9.2h4" />
              </svg>
            </span>
            <div className="min-w-0 pt-1.5">
              <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Convidar atleta</h1>
              <p className="mt-2.5 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                Você precisa de uma dupla ou time cadastrado para enviar convites pelo @.
              </p>
              <p className="mt-2.5 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                Cadastre uma formação primeiro; em seguida volte aqui para convidar atletas pelo nome de usuário.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-4 sm:px-4">
            <div className="mx-auto flex w-full max-w-[230px] flex-col items-center">
              <svg viewBox="0 0 180 180" className="h-32 w-32 drop-shadow-[0_10px_18px_rgba(37,99,235,0.22)]" aria-hidden>
                <circle cx="90" cy="90" r="70" fill="#EEF2FF" />
                <circle cx="66" cy="72" r="18" fill="#3B82F6" />
                <circle cx="92" cy="58" r="23" fill="#2563EB" />
                <circle cx="122" cy="74" r="17" fill="#60A5FA" />
                <path d="M44 118c3-17 14-28 28-28s25 11 28 28" fill="#3B82F6" />
                <path d="M63 120c3-19 15-31 29-31s26 12 29 31" fill="#2563EB" />
                <path d="M102 122c2-13 10-22 20-22s18 9 20 22" fill="#60A5FA" />
                <path d="m110 118 38-9 12 35-35 18-25-22 10-22z" fill="#F8FAFC" />
                <circle cx="128" cy="132" r="14" fill="none" stroke="#64748B" strokeWidth="5" />
                <path d="m118 142 20-20" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <p className="mt-2 text-center text-[26px] font-black leading-[1.1] tracking-tight text-eid-fg sm:text-[36px]">
                Você ainda não é dono de nenhum time ou dupla
              </p>
              <p className="mt-2 text-center text-[11px] leading-snug text-[#556987] sm:text-[13px]">
                Para convidar atletas, é necessário ter uma formação cadastrada (dupla ou time). Crie sua primeira formação e comece a montar seu elenco!
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-[#C9D8F6] bg-[#EFF5FF] px-3 py-2">
              <p className="inline-flex items-start gap-1.5 text-[11px] leading-snug text-[#556987]">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-black text-white">i</span>
                Depois de criar sua formação, você poderá convidar atletas informando o @ do usuário.
              </p>
            </div>

            <ProfileEditDrawerTrigger
              href={cadastrarHref}
              title="Cadastrar formação"
              fullscreen
              topMode="backOnly"
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#2563EB] bg-[linear-gradient(90deg,#1D4ED8,#2563EB)] px-4 text-[12px] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_18px_-14px_rgba(37,99,235,0.8)] transition hover:brightness-105"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Cadastrar dupla ou time
            </ProfileEditDrawerTrigger>
          </div>
        </section>
      </ProfileEditFullscreenShell>
    );
  }

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Convidar atleta"
      subtitle="Escolha sua formação e informe o @ do atleta. O convite aparece no Social dele."
      showBack={false}
      hideHeader
    >
      <section className="mb-4">
        <div className="overflow-hidden rounded-[24px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_84%,var(--eid-primary-500)_16%)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_97%,white_3%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="9" cy="8.2" r="2.8" />
                    <path d="M3.6 18.2a5.4 5.4 0 0 1 10.8 0" />
                    <path d="M17.8 7.2v4M15.8 9.2h4" />
                  </svg>
                </span>
                <div className="min-w-0 pt-1.5">
                  <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Convidar atleta</h1>
                  <p className="mt-2.5 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                    Escolha sua formação e informe o @ do atleta. O convite aparece no Social dele.
                  </p>
                </div>
              </div>
            </div>
            <div className="justify-self-end" aria-hidden>
              <svg viewBox="0 0 180 140" className="h-[84px] w-[84px] drop-shadow-[0_12px_18px_rgba(37,99,235,0.26)] sm:h-[128px] sm:w-[128px]">
                <rect x="58" y="26" width="74" height="88" rx="12" fill="#E2E8F0" />
                <rect x="64" y="32" width="62" height="44" rx="8" fill="#F8FAFC" />
                <path d="M58 70 95 96l37-26v44H58V70Z" fill="#CBD5E1" />
                <circle cx="83" cy="53" r="8" fill="#60A5FA" />
                <path d="M71 68c1.5-6 5.8-9.6 12-9.6s10.5 3.6 12 9.6" fill="#3B82F6" />
                <circle cx="130" cy="100" r="21" fill="#3B82F6" />
                <path d="m121 100 7 5 9-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

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
            inviteStyle="convidar"
          />
        </div>
      </section>
      <section className="mt-3 space-y-2.5">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-primary-500)_10%)] px-3 py-2.5">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-black text-eid-fg">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-white">i</span>
            Como funciona o convite?
          </p>
          <p className="mt-1 text-[11px] text-[#556987]">O atleta receberá o convite no feed do Social. Ao aceitar, ele será adicionado ao elenco da formação.</p>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5">
          <p className="inline-flex items-center gap-2 text-[12px] font-black text-eid-fg">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2563EB]" fill="currentColor" aria-hidden>
              <path d="m12 2 7 2.4V11c0 4.1-2.8 7.7-7 9-4.2-1.3-7-4.9-7-9V4.4L12 2Z" />
              <path d="m12 14.8-3.2-3.2 1.5-1.5 1.7 1.7 3.7-3.7 1.5 1.5-5.2 5.2Z" fill="#93C5FD" />
            </svg>
            Convites seguros e rápidos
          </p>
          <p className="mt-1 text-[11px] text-[#556987]">Você mantém o controle de quem entra na sua formação. O atleta só será adicionado após aceitar o convite.</p>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_94%,var(--eid-surface)_6%)] px-3 py-2.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-[#556987]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="8.5" cy="8.5" r="2.5" />
              <circle cx="15.5" cy="10" r="2.2" />
              <path d="M4 18a5 5 0 0 1 9 0" />
              <path d="M13 18a4 4 0 0 1 7 0" />
            </svg>
            <strong>Dica:</strong> convide atletas que já usam o app para facilitar a aceitação!
          </p>
        </div>
      </section>
    </ProfileEditFullscreenShell>
  );
}
