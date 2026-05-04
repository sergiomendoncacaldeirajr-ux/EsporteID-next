import { redirect } from "next/navigation";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { createClient } from "@/lib/supabase/server";
import { getPerfilTimeIdentity, getPerfilTimePartidasBundle } from "../perfil-time-payload";

export type PerfilTimeHistoricoCompletoStreamProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export async function PerfilTimeHistoricoCompletoStream({ params, searchParams }: PerfilTimeHistoricoCompletoStreamProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const timeId = Number(id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil-time/${id}/historico`, sp));

  const [idn, bundle] = await Promise.all([
    getPerfilTimeIdentity(timeId, user.id),
    getPerfilTimePartidasBundle(timeId, user.id),
  ]);

  return (
    <main className={`${PROFILE_PUBLIC_MAIN_CLASS} pt-3 sm:pt-4`}>
      <div className={`${PROFILE_HERO_PANEL_CLASS} p-3 sm:p-4`}>
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-eid-primary-500/12 text-eid-primary-300">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 19V9" />
              <path d="M10 19V5" />
              <path d="M16 19v-8" />
              <path d="M22 19v-4" />
            </svg>
          </span>
          <h1 className="text-[13px] font-black uppercase tracking-[0.03em] text-eid-fg">Histórico completo</h1>
        </div>
        <p className="mt-0.5 text-[13px] text-eid-text-secondary">
          {idn.t.nome ?? "Equipe"} · {idn.modalidade === "dupla" ? "dupla" : "time"}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-eid-text-secondary">
          Todos os confrontos concluídos desta formação no esporte selecionado.
        </p>
        <div className="mt-3 h-px w-full bg-[color:var(--eid-border-subtle)]" />
        <div className="mt-3">
          <ProfileFormacaoResultados
            totais={bundle.bundleResultados.totais}
            items={bundle.bundleResultados.items}
            resumoCount={500}
            emptyText="Nenhuma partida em equipe concluída listada ainda para esta formação."
            selfLabel={idn.t.nome ?? "Equipe"}
            selfProfileHref={`/perfil-time/${idn.id}`}
            esporteLabel={idn.esp?.nome ?? "Esporte"}
            modalidadeLabel={idn.modalidade === "dupla" ? "Dupla" : "Time"}
          />
        </div>
      </div>
    </main>
  );
}
