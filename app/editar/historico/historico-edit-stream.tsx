import { setViewerHistoricoPublicoAction } from "@/app/perfil/actions";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { createClient } from "@/lib/supabase/server";

export type EditarHistoricoStreamProps = {
  viewerId: string;
  sp: { from?: string; embed?: string };
};

export async function EditarHistoricoStream({ viewerId, sp }: EditarHistoricoStreamProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("mostrar_historico_publico")
    .eq("id", viewerId)
    .maybeSingle();
  const mostrarHistoricoPublico = profile?.mostrar_historico_publico !== false;
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${viewerId}`;
  const isEmbed = sp.embed === "1";

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Privacidade do histórico"
      subtitle="Defina se os visitantes podem ver seu histórico no perfil público."
      showBack={false}
      hideHeader
    >
      <div className="space-y-3">
        {!isEmbed ? <PerfilBackLink href={from} label="Voltar" /> : null}

        <section className="overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 3 5 6v4c0 4.3 2.8 8.1 7 9.4 4.2-1.3 7-5.1 7-9.4V6l-7-3Z" />
                <rect x="9" y="10.2" width="6" height="4.6" rx="1.2" />
                <path d="M10.2 10.2V9a1.8 1.8 0 1 1 3.6 0v1.2" />
              </svg>
            </span>
            <div className="min-w-0 pt-1">
              <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Privacidade do histórico</h1>
              <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                Defina se os visitantes podem ver seu histórico no perfil público.
              </p>
            </div>
          </div>
        </section>

        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Dados de privacidade</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F5D8A6] bg-[#FFF2DF] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-[#B8791D]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 4a8 8 0 1 0 8 8" />
                <path d="M12 1.8v4.4h4.4" />
              </svg>
              Histórico
            </span>
          </div>
          <div className="p-3">
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5" style={{ backgroundColor: mostrarHistoricoPublico ? "var(--eid-hist-status-on-bg)" : "var(--eid-hist-status-off-bg)" }}>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: mostrarHistoricoPublico ? "var(--eid-hist-status-on)" : "var(--eid-hist-status-off)" }}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {mostrarHistoricoPublico ? (
                    <>
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <path d="m4 20 16-16" />
                    </>
                  )}
                </svg>
                Status atual
              </p>
              <p className="mt-1 text-[13px] font-black tracking-tight" style={{ color: mostrarHistoricoPublico ? "var(--eid-hist-status-on)" : "var(--eid-hist-status-off)" }}>
                {mostrarHistoricoPublico ? "Histórico visível no perfil público" : "Histórico oculto no perfil público"}
              </p>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-eid-text-secondary">
              Isso controla o resumo de resultados e o acesso ao histórico completo para{" "}
              <strong className="text-eid-fg">outros usuários</strong>.
            </p>

            <div className="mt-3 h-px w-full bg-[color:var(--eid-border-subtle)]" />

            <form action={setViewerHistoricoPublicoAction.bind(null, !mostrarHistoricoPublico)} className="mt-3">
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#C9D8F6] bg-[#F5F8FF] px-3 text-[11px] font-black uppercase tracking-[0.04em] text-[#2D58A6] transition hover:bg-[#EEF4FF]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {mostrarHistoricoPublico ? (
                    <>
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <path d="m4 20 16-16" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </>
                  )}
                </svg>
                {mostrarHistoricoPublico ? "Ocultar histórico no perfil público" : "Mostrar histórico no perfil público"}
              </button>
            </form>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,white_5%),color-mix(in_srgb,var(--eid-surface)_93%,white_7%))] px-3 py-2.5">
          <p className="inline-flex items-start gap-2 text-[12px] leading-snug text-eid-text-secondary">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[13px] font-black text-white">i</span>
            Ao ocultar o histórico, outras pessoas não poderão ver seus resultados e estatísticas no seu perfil público.
            Você pode alterar essa configuração quando quiser.
          </p>
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

