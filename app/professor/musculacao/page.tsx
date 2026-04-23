import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfessorUser } from "@/lib/professor/server";
import { isMusculacaoSportName } from "@/lib/sport-capabilities";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";

export default async function ProfessorMusculacaoPage() {
  const { supabase, user } = await requireProfessorUser("/professor/musculacao");
  const featureCfg = await getSystemFeatureConfig(supabase);
  if (!canAccessSystemFeature(featureCfg, "professores", user.id)) {
    redirect("/dashboard");
  }

  const [{ data: esportes }, { data: aulas }, { data: solicitacoes }] = await Promise.all([
    supabase
      .from("professor_esportes")
      .select("esporte_id, esportes(nome)")
      .eq("professor_id", user.id)
      .eq("ativo", true),
    supabase
      .from("professor_aulas")
      .select("id, titulo, inicio, tipo_aula, status")
      .eq("professor_id", user.id)
      .order("inicio", { ascending: false })
      .limit(8),
    supabase
      .from("professor_solicitacoes_aula")
      .select("id, status, criado_em")
      .eq("professor_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  const hasMusculacao = (esportes ?? []).some((row) => {
    const esporte = Array.isArray(row.esportes) ? row.esportes[0] : row.esportes;
    return isMusculacaoSportName(esporte?.nome);
  });

  if (!hasMusculacao) {
    return (
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Módulo de Musculação</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Para usar este módulo, marque o esporte <strong className="text-eid-fg">Musculação</strong> no seu perfil de professor.
        </p>
        <Link
          href="/conta/esportes-eid"
          className="mt-4 inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
        >
          Ajustar esportes
        </Link>
      </section>
    );
  }

  const checkinsEstimados = (aulas ?? []).filter((a) => a.status === "concluida").length;
  const solicitacoesPendentes = (solicitacoes ?? []).filter((s) => s.status === "pendente").length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5 lg:col-span-2">
        <h2 className="text-lg font-bold text-eid-fg">Fichas de treino</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Base pronta para gestão de fichas por aluno. Utilize o fluxo de alunos para organizar observações e rotinas até o módulo completo.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href="/professor/alunos" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-3 text-xs font-semibold text-eid-fg">
            Abrir alunos e anexar plano
          </Link>
          <Link href="/professor/agenda" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-3 text-xs font-semibold text-eid-fg">
            Abrir agenda de treinos
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-sm font-bold text-eid-fg">Indicadores rápidos</h3>
        <div className="mt-3 space-y-2 text-xs text-eid-text-secondary">
          <p>Solicitações pendentes: <strong className="text-eid-fg">{solicitacoesPendentes}</strong></p>
          <p>Treinos concluídos (proxy check-in): <strong className="text-eid-fg">{checkinsEstimados}</strong></p>
          <p>Aulas recentes: <strong className="text-eid-fg">{(aulas ?? []).length}</strong></p>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5 lg:col-span-3">
        <h2 className="text-lg font-bold text-eid-fg">Avaliação física e check-ins</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Esta área já separa a jornada de musculação para evoluir com telas específicas (avaliação física, periodização e check-ins pelo social).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/professor/avaliacoes" className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
            Ver avaliações
          </Link>
          <Link href="/professor/alunos" className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
            Ver alunos e check-ins
          </Link>
        </div>
      </section>
    </div>
  );
}
