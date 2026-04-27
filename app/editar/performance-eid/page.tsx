import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { listarPapeis, precisaEsportesPratica } from "@/lib/roles";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfilePerformanceEditor } from "@/components/perfil/edit/profile-performance-editor";
import {
  extrairMesAnoInicio,
  parseTempoExperienciaParaEditor,
} from "@/lib/perfil/parse-tempo-experiencia-eid";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export default async function EditarPerformanceEidFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/performance-eid")}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/editar/performance-eid")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = listarPapeis(papeisRows);
  const needsSport = precisaEsportesPratica(papeis);
  const canAtivarAtleta = papeis.includes("organizador") && !papeis.includes("atleta");
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${user.id}`;
  const isEmbed = sp.embed === "1";

  async function ativarModoAtletaAction() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) redirect("/login?next=%2Feditar%2Fperformance-eid");
    await sb
      .from("usuario_papeis")
      .upsert(
        {
          usuario_id: actionUser.id,
          papel: "atleta",
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,papel" }
      );
    revalidatePath("/editar/performance-eid");
    redirect("/editar/performance-eid");
  }

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, permite_individual, permite_dupla, permite_time")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: eidRows } = await supabase
    .from("usuario_eid")
    .select("esporte_id, modalidade_match, modalidades_match, tempo_experiencia")
    .eq("usuario_id", user.id);

  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);
  const eidRowPorEsporte = new Map((eidRows ?? []).map((r) => [r.esporte_id, r]));
  const selectedEsportesModalidades = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, modalidadesFromUsuarioEidRow(r)])
  );
  const selectedExperiencias = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, parseTempoExperienciaParaEditor(r.tempo_experiencia)])
  ) as Record<number, { tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos"; anos: number; meses: number }>;
  const refAno = new Date().getFullYear();

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar Performance EID"
      subtitle="Configure por esporte se atua como atleta, professor ou ambos."
      showBack={!isEmbed}
    >
      {!needsSport ? (
        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0 text-sm text-eid-text-secondary">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Esportes e EID</p>
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-300">
              Configuração
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <p>
              Esta área é para quem atua como <strong className="text-eid-fg">atleta</strong> ou{" "}
              <strong className="text-eid-fg">professor</strong>.
            </p>
            {canAtivarAtleta ? (
              <form action={ativarModoAtletaAction} className="mt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110"
                >
                  Ativar perfil de atleta
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Esportes e EID</p>
            <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-action-400">
              Performance
            </span>
          </div>
          <div className="p-3">
            <ProfilePerformanceEditor
              sports={(esportes ?? []).map((e) => ({
                id: e.id,
                nome: e.nome,
                permiteIndividual: Boolean(e.permite_individual),
                permiteDupla: Boolean(e.permite_dupla),
                permiteTime: Boolean(e.permite_time),
              }))}
              initialItems={selectedEsportes.map((esporteId) => {
                const raw = eidRowPorEsporte.get(esporteId)?.tempo_experiencia;
                const ma = extrairMesAnoInicio(raw);
                const ed = selectedExperiencias[esporteId] ?? parseTempoExperienciaParaEditor(raw);
                return {
                  esporteId,
                  modalidades:
                    (selectedEsportesModalidades[esporteId] as Array<"individual" | "dupla" | "time"> | undefined) ??
                    ["individual"],
                  tempoTipo: ma ? "inicio" : "faixa",
                  tempo: ed.tempo ?? "1 a 3 anos",
                  tempoAnos: ed.anos ?? 0,
                  tempoMeses: ed.meses ?? 0,
                  inicioMes: ma?.mes ?? 1,
                  inicioAno: ma?.ano ?? Math.max(1970, refAno - 2),
                };
              })}
            />
          </div>
        </section>
      )}
    </ProfileEditFullscreenShell>
  );
}

