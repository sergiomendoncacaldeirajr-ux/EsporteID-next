import { redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfileMainEditor } from "@/components/perfil/edit/profile-main-editor";
import { ProfileMediaEditor } from "@/components/perfil/edit/profile-media-editor";
import { ProfileWhatsappEditor } from "@/components/perfil/edit/profile-whatsapp-editor";
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
      `nome, username, localizacao, avatar_url, foto_capa, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, perfil_completo, whatsapp, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`
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
          <div className="flex items-center justify-between border-b border-[rgba(37,99,235,0.12)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-surface)),color-mix(in_srgb,var(--eid-primary-500)_4%,var(--eid-surface)))] px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-primary-200">Mídia do perfil</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-primary-300 shadow-[0_0_8px_-3px_rgba(37,99,235,0.3)]">
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
          <div className="flex items-center justify-between border-b border-[rgba(249,115,22,0.12)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-action-500)_7%,var(--eid-surface)),color-mix(in_srgb,var(--eid-action-500)_3%,var(--eid-surface)))] px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-action-300">Dados principais</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-action-300 shadow-[0_0_8px_-3px_rgba(249,115,22,0.3)]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="8" r="3" />
                <path d="M6 18a6 6 0 0 1 12 0" />
              </svg>
              Perfil
            </span>
          </div>
          <div className="p-3">
            <ProfileMainEditor
              userId={viewerId}
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

        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[rgba(16,185,129,0.12)] bg-[linear-gradient(90deg,color-mix(in_srgb,rgb(16,185,129)_8%,var(--eid-surface)),color-mix(in_srgb,rgb(16,185,129)_3%,var(--eid-surface)))] px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,rgb(16,185,129)_75%,var(--eid-fg)_25%)]">Contato</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,rgb(16,185,129)_75%,var(--eid-fg)_25%)] shadow-[0_0_8px_-3px_rgba(16,185,129,0.3)]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="#25D366" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.428l4.503-1.444A11.931 11.931 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.003-1.364l-.359-.213-3.72 1.196 1.197-3.641-.234-.374A9.818 9.818 0 0 1 12 2.182c5.424 0 9.818 4.394 9.818 9.818 0 5.424-4.394 9.818-9.818 9.818z" />
              </svg>
              WhatsApp
            </span>
          </div>
          <div className="p-3">
            <ProfileWhatsappEditor initialWhatsapp={(profile as { whatsapp?: string | null }).whatsapp ?? null} />
          </div>
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

