import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ProfessorModoEsportivo,
  ProfessorObjetivoPlataforma,
  ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import { modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { listarPapeis, precisaEsportesPratica } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ContaEsportesForm } from "@/app/conta/esportes-eid/conta-esportes-form";

type Props = {
  searchParams?: Promise<{ from?: string }>;
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

  const { data: professorRows } = await supabase
    .from("professor_esportes")
    .select("esporte_id, modo_atuacao, objetivo_plataforma, tipo_atuacao, tempo_experiencia")
    .eq("professor_id", user.id)
    .eq("ativo", true);

  const selectedSportModes: Record<number, ProfessorModoEsportivo> = {};
  const selectedProfessorObjetivos: Record<number, ProfessorObjetivoPlataforma> = {};
  const selectedProfessorTipos: Record<number, ProfessorTipoAtuacao[]> = {};
  const selectedSet = new Set<number>(selectedEsportes);

  for (const row of professorRows ?? []) {
    const esporteId = Number(row.esporte_id);
    if (!Number.isFinite(esporteId)) continue;
    selectedSet.add(esporteId);
    selectedSportModes[esporteId] = row.modo_atuacao === "professor_e_atleta" ? "ambos" : "professor";
    selectedProfessorObjetivos[esporteId] =
      row.objetivo_plataforma === "gerir_alunos" || row.objetivo_plataforma === "ambos"
        ? row.objetivo_plataforma
        : "somente_exposicao";
    selectedProfessorTipos[esporteId] = Array.isArray(row.tipo_atuacao)
      ? row.tipo_atuacao
          .map((item) => String(item))
          .filter((item): item is ProfessorTipoAtuacao => ["aulas", "treinamento", "consultoria"].includes(item))
      : ["aulas"];
    if (!selectedExperiencias[esporteId]) {
      selectedExperiencias[esporteId] =
        row.tempo_experiencia === "Menos de 1 ano"
          ? "menos_1"
          : row.tempo_experiencia === "1 a 3 anos"
            ? "1_3"
            : "mais_3";
    }
  }
  for (const esporteId of selectedEsportes) {
    if (!selectedSportModes[esporteId]) selectedSportModes[esporteId] = "atleta";
  }

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar Performance EID"
      subtitle="Configure por esporte se atua como atleta, professor ou ambos."
    >
      {!needsSport ? (
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-5 text-sm text-eid-text-secondary">
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
          <p className="mb-4 text-xs text-eid-text-secondary">
            Nome, foto e cidade:{" "}
            <Link href={`/editar/perfil?from=${encodeURIComponent(from)}`} className="font-semibold text-eid-primary-300 underline">
              Editar perfil
            </Link>
          </p>
          <ContaEsportesForm
            esportes={(esportes ?? []).map((e) => ({
              id: e.id,
              nome: e.nome,
              permiteIndividual: Boolean(e.permite_individual),
              permiteDupla: Boolean(e.permite_dupla),
              permiteTime: Boolean(e.permite_time),
            }))}
            selectedEsportes={[...selectedSet]}
            selectedEsportesInteresse={selectedEsportesInteresse}
            selectedEsportesModalidades={selectedEsportesModalidades}
            selectedSportModes={selectedSportModes}
            selectedProfessorObjetivos={selectedProfessorObjetivos}
            selectedProfessorTipos={selectedProfessorTipos}
            selectedExperiencias={selectedExperiencias}
            hasProfessor={papeis.includes("professor")}
            hasAtleta={papeis.includes("atleta")}
          />
        </>
      )}
    </ProfileEditFullscreenShell>
  );
}

