import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorAvaliacoesPage() {
  const { supabase, user } = await requireProfessorUser("/professor/avaliacoes");

  const [{ data: metricas }, { data: ciclos }, { data: respostas }] = await Promise.all([
    supabase
      .from("professor_metricas")
      .select("nota_docente, total_avaliacoes_validas, taxa_presenca, taxa_cancelamento, esportes(nome)")
      .eq("professor_id", user.id)
      .order("nota_docente", { ascending: false }),
    supabase
      .from("professor_feedback_ciclos")
      .select("id, competencia_ano, competencia_mes, status, aulas_pagas_periodo, profiles!professor_feedback_ciclos_aluno_id_fkey(nome)")
      .eq("professor_id", user.id)
      .order("competencia_ano", { ascending: false })
      .order("competencia_mes", { ascending: false })
      .limit(12),
    supabase
      .from("professor_feedback_respostas")
      .select("id, nota_geral, nps, comentario, respondido_em, professor_feedback_ciclos!inner(professor_id, profiles!professor_feedback_ciclos_aluno_id_fkey(nome))")
      .eq("professor_feedback_ciclos.professor_id", user.id)
      .order("respondido_em", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Métricas docentes</h2>
        <div className="mt-4 space-y-3">
          {(metricas ?? []).length ? (
            (metricas ?? []).map((item, idx) => {
              const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
              return (
                <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <p className="text-sm font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Nota docente {Number(item.nota_docente ?? 0).toFixed(2)} · {item.total_avaliacoes_validas ?? 0} avaliações válidas
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Presença {(Number(item.taxa_presenca ?? 0) * 100).toFixed(0)}% · Cancelamento {(Number(item.taxa_cancelamento ?? 0) * 100).toFixed(0)}%
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">Sem métricas consolidadas ainda.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Ciclos mensais</h2>
          <div className="mt-4 space-y-2">
            {(ciclos ?? []).length ? (
              (ciclos ?? []).map((ciclo) => {
                const aluno = Array.isArray(ciclo.profiles) ? ciclo.profiles[0] : ciclo.profiles;
                return (
                  <div key={ciclo.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <p className="text-sm font-semibold text-eid-fg">
                      {String(ciclo.competencia_mes).padStart(2, "0")}/{ciclo.competencia_ano}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {aluno?.nome ?? "Aluno"} · {ciclo.status} · {ciclo.aulas_pagas_periodo ?? 0} aulas pagas no período
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhum ciclo mensal aberto ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Feedbacks recebidos</h2>
          <div className="mt-4 space-y-2">
            {(respostas ?? []).length ? (
              (respostas ?? []).map((resposta) => {
                const ciclo = Array.isArray(resposta.professor_feedback_ciclos)
                  ? resposta.professor_feedback_ciclos[0]
                  : resposta.professor_feedback_ciclos;
                const aluno =
                  ciclo && "profiles" in ciclo
                    ? Array.isArray(ciclo.profiles)
                      ? ciclo.profiles[0]
                      : ciclo.profiles
                    : null;
                return (
                  <div key={resposta.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <p className="text-sm font-semibold text-eid-fg">
                      {aluno?.nome ?? "Aluno"} · nota {resposta.nota_geral}/5
                      {resposta.nps != null ? ` · NPS ${resposta.nps}` : ""}
                    </p>
                    {resposta.comentario ? (
                      <p className="mt-1 text-xs text-eid-text-secondary">{resposta.comentario}</p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhum feedback respondido ainda.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
