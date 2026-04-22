import { redirect } from "next/navigation";
import { setViewerHistoricoPublicoAction } from "@/app/perfil/actions";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarHistoricoFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/historico")}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("mostrar_historico_publico")
    .eq("id", user.id)
    .maybeSingle();
  const mostrarHistoricoPublico = profile?.mostrar_historico_publico !== false;
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${user.id}`;
  const isEmbed = sp.embed === "1";

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Privacidade do histórico"
      subtitle="Defina se os visitantes podem ver seu histórico no perfil público."
      showBack={!isEmbed}
    >
      <div className="eid-surface-panel rounded-2xl p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Dados de privacidade</p>
        <div
          className="inline-flex flex-col gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2"
          style={{
            backgroundColor: mostrarHistoricoPublico ? "var(--eid-hist-status-on-bg)" : "var(--eid-hist-status-off-bg)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Status atual</p>
          <p
            className="text-sm font-black tracking-tight"
            style={{ color: mostrarHistoricoPublico ? "var(--eid-hist-status-on)" : "var(--eid-hist-status-off)" }}
          >
            {mostrarHistoricoPublico ? "Histórico visível no perfil público" : "Histórico oculto no perfil público"}
          </p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
          Isso controla o resumo de resultados e o acesso ao histórico completo para <strong className="text-eid-fg">outros usuários</strong>.
        </p>
        <form action={setViewerHistoricoPublicoAction.bind(null, !mostrarHistoricoPublico)} className="mt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-fg transition hover:border-eid-primary-500/35"
          >
            {mostrarHistoricoPublico ? "Ocultar histórico no perfil público" : "Mostrar histórico no perfil público"}
          </button>
        </form>
      </div>
    </ProfileEditFullscreenShell>
  );
}

