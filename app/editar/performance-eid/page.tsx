import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { listarPapeis, precisaEsportesPratica } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfilePerformanceEditor } from "@/components/perfil/edit/profile-performance-editor";

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
    .select("perfil_completo, termos_aceitos_em")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.termos_aceitos_em) {
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
    .select("esporte_id, interesse_match, modalidade_match, modalidades_match, tempo_experiencia")
    .eq("usuario_id", user.id);

  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);
  const selectedEsportesInteresse = Object.fromEntries(
    (eidRows ?? []).map((r) => [
      r.esporte_id,
      r.interesse_match === "ranking" ? "ranking" : r.interesse_match === "amistoso" ? "amistoso" : "ranking_e_amistoso",
    ])
  ) as Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  const selectedEsportesModalidades = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, modalidadesFromUsuarioEidRow(r)])
  );
  const selectedExperiencias = Object.fromEntries(
    (eidRows ?? []).map((r) => [
      r.esporte_id,
      r.tempo_experiencia === "Menos de 1 ano" ? "menos_1" : r.tempo_experiencia === "1 a 3 anos" ? "1_3" : "mais_3",
    ])
  ) as Record<number, "menos_1" | "1_3" | "mais_3">;

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar Performance EID"
      subtitle="Configure por esporte se atua como atleta, professor ou ambos."
      showBack={!isEmbed}
    >
      {!needsSport ? (
        <div className="eid-surface-panel rounded-2xl p-4 sm:p-5 text-sm text-eid-text-secondary">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Esportes e EID</p>
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
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Esportes e EID</p>
          <ProfilePerformanceEditor
            sports={(esportes ?? []).map((e) => ({
              id: e.id,
              nome: e.nome,
              permiteIndividual: Boolean(e.permite_individual),
              permiteDupla: Boolean(e.permite_dupla),
              permiteTime: Boolean(e.permite_time),
            }))}
            initialItems={selectedEsportes.map((esporteId) => ({
              esporteId,
              interesse: selectedEsportesInteresse[esporteId] ?? "ranking_e_amistoso",
              modalidades:
                (selectedEsportesModalidades[esporteId] as Array<"individual" | "dupla" | "time"> | undefined) ??
                ["individual"],
              tempo:
                selectedExperiencias[esporteId] === "menos_1"
                  ? "Menos de 1 ano"
                  : selectedExperiencias[esporteId] === "mais_3"
                    ? "Mais de 3 anos"
                    : "1 a 3 anos",
            }))}
          />
        </>
      )}
    </ProfileEditFullscreenShell>
  );
}

