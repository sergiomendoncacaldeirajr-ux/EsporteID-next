import { redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfileMainEditor } from "@/components/perfil/edit/profile-main-editor";
import { ProfileMediaEditor } from "@/components/perfil/edit/profile-media-editor";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";

export type EditarPerfilStreamProps = {
  viewerId: string;
  sp: { from?: string; embed?: string };
};

export async function EditarPerfilStream({ viewerId, sp }: EditarPerfilStreamProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `nome, username, localizacao, avatar_url, foto_capa, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`
    )
    .eq("id", viewerId)
    .maybeSingle();

  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/editar/perfil")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${viewerId}`;
  const isEmbed = sp.embed === "1";

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar perfil"
      subtitle="Dados pessoais públicos. Alterações entram em vigor após salvar."
      showBack={false}
      hideHeader
    >
      <div className="space-y-3">
        {!isEmbed ? <PerfilBackLink href={from} label="Voltar" /> : null}
        <section className="overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="10" cy="8" r="3.2" />
                <path d="M4.5 18a6 6 0 0 1 11 0" />
                <path d="m16.8 16.2 3.2-3.2" />
                <path d="m17.8 19 3.2-3.2" />
              </svg>
            </span>
            <div className="min-w-0 pt-1">
              <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Editar perfil</h1>
              <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                Dados pessoais públicos. Alterações entram em vigor após salvar.
              </p>
            </div>
          </div>
        </section>
        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Mídia do perfil</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="6" width="16" height="12" rx="2" />
                <circle cx="9" cy="10" r="1.5" />
                <path d="m7 16 3.5-3.5L13 15l2.5-2.5L18 15" />
              </svg>
              Avatar e capa
            </span>
          </div>
          <div className="p-3">
            <ProfileMediaEditor avatarUrl={profile.avatar_url ?? null} coverUrl={profile.foto_capa ?? null} />
          </div>
        </section>

        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Dados principais</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F5D8A6] bg-[#FFF2DF] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-[#B8791D]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="8" r="3" />
                <path d="M6 18a6 6 0 0 1 12 0" />
              </svg>
              Perfil
            </span>
          </div>
          <div className="p-3">
            <ProfileMainEditor
              initial={{
                nome: profile.nome ?? "",
                username: profile.username ?? "",
                localizacao: profile.localizacao ?? "",
                alturaCm: profile.altura_cm ?? null,
                pesoKg: profile.peso_kg ?? null,
                lado: profile.lado ?? null,
              }}
            />
          </div>
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

