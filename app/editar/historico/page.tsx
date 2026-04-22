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
        <p className="text-sm font-semibold text-eid-fg">
          Atualmente:{" "}
          <span className={mostrarHistoricoPublico ? "text-emerald-300" : "text-red-300"}>
            {mostrarHistoricoPublico ? "Histórico visível" : "Histórico oculto"}
          </span>
        </p>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Isso controla a exibição do resumo de resultados e o acesso ao histórico completo para outros usuários.
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

