import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type {
  ProfessorModoEsportivo,
  ProfessorObjetivoPlataforma,
  ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import { modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { CONTA_PERFIL_HREF } from "@/lib/routes/conta";
import { listarPapeis, precisaEsportesPratica } from "@/lib/roles";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { parseTempoExperienciaParaChaveAprox } from "@/lib/perfil/parse-tempo-experiencia-eid";
import { ContaEsportesForm } from "./conta-esportes-form";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";

export const metadata = {
  title: "Esportes e EID · EsporteID",
};

export default async function ContaEsportesEidPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fconta%2Fesportes-eid");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/conta/esportes-eid")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = listarPapeis(papeisRows);
  const needsSport = precisaEsportesPratica(papeis);
  const canAtivarAtleta = papeis.includes("organizador") && !papeis.includes("atleta");

  async function ativarModoAtletaAction() {
    "use server";

    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) redirect("/login?next=%2Fconta%2Fesportes-eid");

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

    revalidatePath("/conta/esportes-eid");
    redirect("/conta/esportes-eid");
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
  const selectedEsportesModalidades = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, modalidadesFromUsuarioEidRow(r)])
  );
  const selectedExperiencias = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, parseTempoExperienciaParaChaveAprox(r.tempo_experiencia)])
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
    selectedSportModes[esporteId] =
      row.modo_atuacao === "professor_e_atleta" ? "ambos" : "professor";
    selectedProfessorObjetivos[esporteId] =
      row.objetivo_plataforma === "gerir_alunos" || row.objetivo_plataforma === "ambos"
        ? row.objetivo_plataforma
        : "somente_exposicao";
    selectedProfessorTipos[esporteId] = Array.isArray(row.tipo_atuacao)
      ? row.tipo_atuacao
          .map((item) => String(item))
          .filter((item): item is ProfessorTipoAtuacao =>
            ["aulas", "treinamento", "consultoria"].includes(item)
          )
      : ["aulas"];
    if (!selectedExperiencias[esporteId]) {
      selectedExperiencias[esporteId] = parseTempoExperienciaParaChaveAprox(row.tempo_experiencia);
    }
  }
  for (const esporteId of selectedEsportes) {
    if (!selectedSportModes[esporteId]) selectedSportModes[esporteId] = "atleta";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-eid-fg sm:text-xl">Esportes e EID</h1>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Configure por esporte se voce atua como atleta, professor ou ambos.
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 text-xs font-medium text-eid-primary-300 hover:text-eid-fg">
            Painel
          </Link>
        </div>

        {!needsSport ? (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-5 text-sm text-eid-text-secondary">
            <p>
              Esta área é para quem atua como <strong className="text-eid-fg">atleta</strong> ou{" "}
              <strong className="text-eid-fg">professor</strong> no cadastro. Seus papéis atuais não incluem essa
              função.
            </p>
            {canAtivarAtleta ? (
              <form action={ativarModoAtletaAction} className="mt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110"
                >
                  Ativar perfil de atleta
                </button>
                <p className="mt-2 text-xs text-eid-text-secondary">
                  Isso libera o Modo Atleta no menu e permite configurar seus esportes e EID sem remover o papel de organizador.
                </p>
              </form>
            ) : null}
            <p className="mt-3">
              <Link href="/dashboard" className="font-semibold text-eid-primary-300 underline">
                Voltar ao painel
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-eid-text-secondary">
              Nome, foto e cidade:{" "}
              <Link href={CONTA_PERFIL_HREF} className="font-semibold text-eid-primary-300 underline">
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
                suportaConfronto: isSportMatchEnabled(e.nome),
              }))}
              selectedEsportes={[...selectedSet]}
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
    </main>
  );
}
