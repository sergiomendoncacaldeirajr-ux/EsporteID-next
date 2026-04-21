import Link from "next/link";
import { requireProfessorUser } from "@/lib/professor/server";

function moeda(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

export default async function ProfessorHomePage() {
  const { supabase, user } = await requireProfessorUser("/professor");

  const [{ data: perfil }, { data: esportes }, { data: aulas }, { data: pagamentos }, { data: metricas }, { count: solicitacoesPendentes }] =
    await Promise.all([
      supabase
        .from("professor_perfil")
        .select("headline, aceita_novos_alunos, perfil_publicado")
        .eq("usuario_id", user.id)
        .maybeSingle(),
      supabase
        .from("professor_esportes")
        .select("esporte_id, valor_base_centavos, esportes(nome)")
        .eq("professor_id", user.id)
        .eq("ativo", true),
      supabase
        .from("professor_aulas")
        .select("id, titulo, inicio, status")
        .eq("professor_id", user.id)
        .order("inicio", { ascending: true })
        .limit(5),
      supabase
        .from("professor_pagamentos")
        .select("status, valor_liquido_professor_centavos")
        .eq("professor_id", user.id),
      supabase
        .from("professor_metricas")
        .select("nota_docente, total_avaliacoes_validas, esportes(nome)")
        .eq("professor_id", user.id)
        .order("nota_docente", { ascending: false })
        .limit(3),
      supabase
        .from("professor_solicitacoes_aula")
        .select("id", { count: "exact", head: true })
        .eq("professor_id", user.id)
        .eq("status", "pendente"),
    ]);

  const totalReceber = (pagamentos ?? [])
    .filter((item) => item.status === "approved" || item.status === "received")
    .reduce((sum, item) => sum + Number(item.valor_liquido_professor_centavos ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Resumo operacional</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
            <p className="text-xs text-eid-text-secondary">Esportes ativos</p>
            <p className="mt-1 text-2xl font-bold text-eid-fg">{(esportes ?? []).length}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
            <p className="text-xs text-eid-text-secondary">Aulas recentes</p>
            <p className="mt-1 text-2xl font-bold text-eid-fg">{(aulas ?? []).length}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
            <p className="text-xs text-eid-text-secondary">Liquido recebido</p>
            <p className="mt-1 text-2xl font-bold text-eid-fg">{moeda(totalReceber)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/10 p-4">
          <p className="text-xs text-eid-text-secondary">Solicitações pendentes</p>
          <p className="mt-1 text-2xl font-bold text-eid-fg">{solicitacoesPendentes ?? 0}</p>
          <Link href="/professor/alunos" className="mt-3 inline-flex text-xs font-semibold text-eid-primary-300 underline">
            Abrir solicitações e alunos
          </Link>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Link href="/professor/agenda" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-3 text-xs font-semibold text-eid-fg">
            Abrir agenda
          </Link>
          <Link href="/professor/alunos" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-3 text-xs font-semibold text-eid-fg">
            Ver alunos e faltas
          </Link>
          <Link href={`/professor/${user.id}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-3 text-xs font-semibold text-eid-fg">
            Ver perfil público
          </Link>
        </div>

        <div className="mt-5 rounded-xl border border-eid-action-500/20 bg-eid-action-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-eid-action-400">
            Perfil profissional
          </p>
          <p className="mt-2 text-sm text-eid-fg">{perfil?.headline ?? "Defina sua headline e proposta profissional."}</p>
          <p className="mt-2 text-xs text-eid-text-secondary">
            {perfil?.aceita_novos_alunos ? "Aceitando novos alunos." : "Captação de alunos pausada."}{" "}
            {perfil?.perfil_publicado ? "Perfil público publicado." : "Perfil público ainda não publicado."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/professor/perfil" className="rounded-lg border border-eid-action-500/35 px-3 py-2 text-xs font-semibold text-eid-action-400">
              Editar perfil
            </Link>
            <Link href={`/professor/${user.id}`} className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
              Ver página pública
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Próximas aulas</h2>
          <div className="mt-3 space-y-2">
            {(aulas ?? []).length ? (
              (aulas ?? []).map((aula) => (
                <div key={aula.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                  <p className="text-sm font-semibold text-eid-fg">{aula.titulo ?? `Aula #${aula.id}`}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    {aula.inicio ? new Date(aula.inicio).toLocaleString("pt-BR") : "Sem horário"} · {aula.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhuma aula agendada ainda.</p>
            )}
          </div>
          <Link href="/professor/agenda" className="mt-4 inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
            Abrir agenda
          </Link>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Nota docente</h2>
          <div className="mt-3 space-y-2">
            {(metricas ?? []).length ? (
              (metricas ?? []).map((item, idx) => {
                const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                return (
                  <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <p className="text-sm font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Nota {Number(item.nota_docente ?? 0).toFixed(2)} · {item.total_avaliacoes_validas ?? 0} avaliações válidas
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Sem avaliações válidas ainda.</p>
            )}
          </div>
          <Link href="/professor/avaliacoes" className="mt-4 inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
            Ver avaliações
          </Link>
        </div>
      </section>
    </div>
  );
}
