import {
  cancelarAulaProfessorAction,
  concluirAulaProfessorAction,
  criarAulaProfessorAction,
  criarDisponibilidadeProfessorAction,
  inscreverAlunoEmAulaAction,
} from "@/app/professor/actions";
import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorAgendaPage() {
  const { supabase, user } = await requireProfessorUser("/professor/agenda");

  const [{ data: esportes }, { data: locais }, { data: disponibilidades }, { data: aulas }] = await Promise.all([
    supabase
      .from("professor_esportes")
      .select("esporte_id, esportes(nome)")
      .eq("professor_id", user.id)
      .eq("ativo", true),
    supabase
      .from("professor_locais")
      .select("espaco_id, espacos_genericos(nome_publico)")
      .eq("professor_id", user.id)
      .eq("status_vinculo", "ativo"),
    supabase
      .from("professor_disponibilidades")
      .select("id, dia_semana, hora_inicio, hora_fim, capacidade, esportes(nome), espacos_genericos(nome_publico)")
      .eq("professor_id", user.id)
      .order("dia_semana", { ascending: true }),
    supabase
      .from("professor_aulas")
      .select("id, titulo, inicio, fim, status, tipo_aula, valor_total_centavos, esportes(nome), espacos_genericos(nome_publico)")
      .eq("professor_id", user.id)
      .order("inicio", { ascending: true })
      .limit(12),
  ]);

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const aulaIds = (aulas ?? []).map((item) => item.id);
  const { data: vinculos } = aulaIds.length
    ? await supabase
        .from("professor_aula_alunos")
        .select("aula_id, status_inscricao")
        .in("aula_id", aulaIds)
    : { data: [] as Array<{ aula_id: number; status_inscricao: string | null }> };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
      <section className="space-y-4">
        <form action={criarDisponibilidadeProfessorAction} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Disponibilidade recorrente</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select name="esporte_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              <option value="">Esporte (opcional)</option>
              {(esportes ?? []).map((item, idx) => {
                const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                return (
                  <option key={`${item.esporte_id}-${idx}`} value={item.esporte_id}>
                    {esporte?.nome ?? `Esporte ${item.esporte_id}`}
                  </option>
                );
              })}
            </select>
            <select name="espaco_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              <option value="">Local (opcional)</option>
              {(locais ?? []).map((item, idx) => {
                const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
                return (
                  <option key={`${item.espaco_id}-${idx}`} value={item.espaco_id}>
                    {espaco?.nome_publico ?? `Local ${item.espaco_id}`}
                  </option>
                );
              })}
            </select>
            <select name="dia_semana" defaultValue="1" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              {diasSemana.map((dia, idx) => (
                <option key={dia} value={idx}>
                  {dia}
                </option>
              ))}
            </select>
            <input type="number" min={1} name="capacidade" defaultValue={1} placeholder="Capacidade" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="time" name="hora_inicio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="time" name="hora_fim" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
          </div>
          <textarea name="observacoes" rows={2} placeholder="Observações" className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm" />
          <button className="eid-btn-primary mt-4 rounded-xl px-5 py-3 text-sm font-bold">Adicionar disponibilidade</button>
        </form>

        <form action={criarAulaProfessorAction} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Agendar aula</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select name="esporte_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              {(esportes ?? []).map((item, idx) => {
                const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                return (
                  <option key={`${item.esporte_id}-${idx}`} value={item.esporte_id}>
                    {esporte?.nome ?? `Esporte ${item.esporte_id}`}
                  </option>
                );
              })}
            </select>
            <select name="espaco_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              <option value="">Sem local vinculado</option>
              {(locais ?? []).map((item, idx) => {
                const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
                return (
                  <option key={`${item.espaco_id}-${idx}`} value={item.espaco_id}>
                    {espaco?.nome_publico ?? `Local ${item.espaco_id}`}
                  </option>
                );
              })}
            </select>
            <input name="titulo" placeholder="Título da aula" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <select name="tipo_aula" defaultValue="individual" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              <option value="individual">Individual</option>
              <option value="grupo">Grupo</option>
              <option value="avaliacao">Avaliação</option>
              <option value="treino">Treino</option>
            </select>
            <input type="datetime-local" name="inicio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="datetime-local" name="fim" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="number" min={1} name="capacidade" defaultValue={1} placeholder="Capacidade" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="number" min={0} name="valor_total_centavos" defaultValue={0} placeholder="Valor total (centavos)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
          </div>
          <textarea name="descricao" rows={3} placeholder="Descrição / plano da aula" className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm" />
          <button className="eid-btn-primary mt-4 rounded-xl px-5 py-3 text-sm font-bold">Criar aula</button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Minha agenda</h2>
          <div className="mt-4 space-y-3">
            {(aulas ?? []).length ? (
              (aulas ?? []).map((aula) => {
                const esporte = Array.isArray(aula.esportes) ? aula.esportes[0] : aula.esportes;
                const espaco = Array.isArray(aula.espacos_genericos) ? aula.espacos_genericos[0] : aula.espacos_genericos;
                const participantes = (vinculos ?? []).filter((item) => item.aula_id === aula.id);
                const confirmados = participantes.filter((item) => item.status_inscricao === "confirmada").length;
                const cancelados = participantes.filter((item) => item.status_inscricao === "cancelada").length;
                const faltas = participantes.filter((item) => item.status_inscricao === "faltou").length;
                return (
                  <div key={aula.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-eid-fg">{aula.titulo ?? `Aula #${aula.id}`}</p>
                        <p className="mt-1 text-xs text-eid-text-secondary">
                          {esporte?.nome ?? "Esporte"} · {aula.tipo_aula} · {aula.status}
                        </p>
                        <p className="mt-1 text-xs text-eid-text-secondary">
                          {aula.inicio ? new Date(aula.inicio).toLocaleString("pt-BR") : "Sem início"} até{" "}
                          {aula.fim ? new Date(aula.fim).toLocaleString("pt-BR") : "sem fim"}
                        </p>
                        {espaco?.nome_publico ? (
                          <p className="mt-1 text-xs text-eid-text-secondary">Local: {espaco.nome_publico}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-eid-text-secondary">
                          Alunos {participantes.length} · confirmados {confirmados} · cancelados {cancelados} · faltas {faltas}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-eid-action-400">
                        R$ {(Number(aula.valor_total_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <form action={inscreverAlunoEmAulaAction} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                        <input type="hidden" name="aula_id" value={aula.id} />
                        <input name="aluno_username" placeholder="Username do aluno" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <input type="number" min={0} name="valor_centavos" placeholder="Valor (centavos)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <button className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                          Vincular aluno
                        </button>
                      </form>
                      <form action={concluirAulaProfessorAction}>
                        <input type="hidden" name="aula_id" value={aula.id} />
                        <button className="rounded-xl border border-eid-action-500/35 px-3 py-2 text-xs font-semibold text-eid-action-400">
                          Concluir aula
                        </button>
                      </form>
                    </div>
                    {aula.status !== "cancelada" && aula.status !== "concluida" ? (
                      <form action={cancelarAulaProfessorAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                        <input type="hidden" name="aula_id" value={aula.id} />
                        <input
                          name="motivo_cancelamento"
                          placeholder="Motivo do cancelamento"
                          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                        />
                        <button className="rounded-xl border border-red-400/35 px-3 py-2 text-xs font-semibold text-red-200">
                          Cancelar aula
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhuma aula cadastrada ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Disponibilidades salvas</h2>
          <div className="mt-4 space-y-2">
            {(disponibilidades ?? []).length ? (
              (disponibilidades ?? []).map((item) => {
                const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
                return (
                  <div key={item.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <p className="text-sm font-semibold text-eid-fg">
                      {diasSemana[item.dia_semana ?? 0] ?? "Dia"} · {item.hora_inicio} - {item.hora_fim}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {esporte?.nome ?? "Todos os esportes"} · {espaco?.nome_publico ?? "Sem local fixo"} · capacidade {item.capacidade}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhuma disponibilidade cadastrada.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
