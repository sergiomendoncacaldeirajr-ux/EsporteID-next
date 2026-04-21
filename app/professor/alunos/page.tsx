import Link from "next/link";
import {
  atualizarStatusAlunoAulaProfessorAction,
  responderSolicitacaoProfessorAction,
} from "@/app/professor/actions";
import { ProfessorChargeButton } from "@/components/professor/charge-button";
import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorAlunosPage() {
  const { supabase, user } = await requireProfessorUser("/professor/alunos");

  const aulaIds =
    (
      await supabase
        .from("professor_aulas")
        .select("id")
        .eq("professor_id", user.id)
    ).data?.map((row) => row.id) ?? [-1];

  const [{ data: alunos }, { data: solicitacoes }] = await Promise.all([
    supabase
      .from("professor_aula_alunos")
      .select(
        "id, valor_centavos, status_pagamento, status_inscricao, aluno_id, taxa_cancelamento_centavos, motivo_cancelamento, profiles!professor_aula_alunos_aluno_id_fkey(nome, username), professor_aulas(id, titulo, inicio)"
      )
      .in("aula_id", aulaIds)
      .order("id", { ascending: false }),
    supabase
      .from("professor_solicitacoes_aula")
      .select(
        "id, mensagem, status, criado_em, aluno_id, profiles!professor_solicitacoes_aula_aluno_id_fkey(nome, username), esportes(nome)"
      )
      .eq("professor_id", user.id)
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Solicitações recebidas</h2>
        <div className="mt-4 space-y-3">
          {(solicitacoes ?? []).length ? (
            (solicitacoes ?? []).map((registro) => {
              const aluno = Array.isArray(registro.profiles) ? registro.profiles[0] : registro.profiles;
              const esporte = Array.isArray(registro.esportes) ? registro.esportes[0] : registro.esportes;
              const isPendente = registro.status === "pendente";

              return (
                <div key={registro.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">{aluno?.nome ?? "Aluno"}</p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        @{aluno?.username ?? "sem-username"} · {esporte?.nome ?? "Esporte"} · {registro.status}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        Pedido em {registro.criado_em ? new Date(registro.criado_em).toLocaleString("pt-BR") : "-"}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
                        {registro.mensagem || "O aluno não enviou mensagem adicional."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isPendente ? (
                        <>
                          <form action={responderSolicitacaoProfessorAction}>
                            <input type="hidden" name="solicitacao_id" value={registro.id} />
                            <input type="hidden" name="status" value="aceita" />
                            <button className="rounded-lg bg-eid-action-500 px-3 py-2 text-xs font-bold text-[var(--eid-brand-ink)]">
                              Aceitar
                            </button>
                          </form>
                          <form action={responderSolicitacaoProfessorAction}>
                            <input type="hidden" name="solicitacao_id" value={registro.id} />
                            <input type="hidden" name="status" value="recusada" />
                            <button className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                              Recusar
                            </button>
                          </form>
                        </>
                      ) : null}
                      <Link href={`/perfil/${registro.aluno_id}`} className="text-xs font-semibold text-eid-primary-300 underline">
                        Ver perfil
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Ainda não há solicitações abertas vindas do seu perfil público.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Alunos vinculados</h2>
        <div className="mt-4 space-y-3">
          {(alunos ?? []).length ? (
            (alunos ?? []).map((registro) => {
              const aluno = Array.isArray(registro.profiles) ? registro.profiles[0] : registro.profiles;
              const aula = Array.isArray(registro.professor_aulas) ? registro.professor_aulas[0] : registro.professor_aulas;
              return (
                <div key={registro.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">{aluno?.nome ?? "Aluno"}</p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        @{aluno?.username ?? "sem-username"} · {registro.status_inscricao} · pagamento {registro.status_pagamento}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        Aula: {aula?.titulo ?? `#${aula?.id ?? "-"}`} · {aula?.inicio ? new Date(aula.inicio).toLocaleString("pt-BR") : "sem horário"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-eid-action-400">
                        R$ {(Number(registro.valor_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                      </p>
                      {Number(registro.taxa_cancelamento_centavos ?? 0) > 0 ? (
                        <p className="mt-1 text-xs text-eid-action-400">
                          Retenção: R$ {(Number(registro.taxa_cancelamento_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                        </p>
                      ) : null}
                      {registro.status_pagamento !== "pago" && Number(registro.valor_centavos ?? 0) > 0 ? (
                        <div className="mt-2">
                          <ProfessorChargeButton aulaAlunoId={registro.id} />
                        </div>
                      ) : null}
                      {["confirmada", "concluida"].includes(String(registro.status_inscricao ?? "")) ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <form action={atualizarStatusAlunoAulaProfessorAction}>
                            <input type="hidden" name="vinculo_id" value={registro.id} />
                            <input type="hidden" name="status" value="faltou" />
                            <button className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                              Marcar falta
                            </button>
                          </form>
                          <form action={atualizarStatusAlunoAulaProfessorAction}>
                            <input type="hidden" name="vinculo_id" value={registro.id} />
                            <input type="hidden" name="status" value="confirmada" />
                            <button className="w-full rounded-lg border border-eid-primary-500/35 px-3 py-2 text-xs font-semibold text-eid-primary-300">
                              Reativar
                            </button>
                          </form>
                        </div>
                      ) : null}
                      {aluno?.username ? (
                        <Link href={`/perfil/${registro.aluno_id}`} className="mt-2 inline-flex text-xs font-semibold text-eid-primary-300 underline">
                          Ver perfil
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {registro.motivo_cancelamento ? (
                    <p className="mt-3 text-xs text-eid-text-secondary">
                      Registro do aluno: {registro.motivo_cancelamento}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Ainda não há alunos vinculados às suas aulas. Use a agenda para cadastrar alunos por username.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
