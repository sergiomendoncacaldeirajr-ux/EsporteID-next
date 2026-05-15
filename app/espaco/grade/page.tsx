import {
  atualizarHorarioSemanalEspacoAction,
  criarGradeAutomaticaEspacoAction,
  criarHorarioSemanalEspacoAction,
  removerHorarioSemanalEspacoAction,
} from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const HORARIO_META_PREFIX = "[eid-horario]";

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

function parseHorarioObservacoes(raw: unknown) {
  const linhas = String(raw ?? "")
    .split("\n")
    .map((linha) => linha.trimEnd());
  let modoReserva = "mista" as "mista" | "paga" | "gratuita";
  const texto = linhas
    .filter((linha) => {
      if (!linha.trim().startsWith(HORARIO_META_PREFIX)) return true;
      try {
        const parsed = JSON.parse(linha.trim().slice(HORARIO_META_PREFIX.length));
        const modo = String(parsed?.modoReserva ?? "");
        if (modo === "paga" || modo === "gratuita" || modo === "mista") modoReserva = modo;
      } catch {
        return false;
      }
      return false;
    })
    .join("\n")
    .trim();
  return { texto, modoReserva };
}

function modoLabel(modo: "mista" | "paga" | "gratuita") {
  if (modo === "paga") return "Somente paga";
  if (modo === "gratuita") return "Somente gratuita";
  return "Paga ou grátis";
}

export default async function EspacoGradePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/grade",
    espacoId,
  });

  const [{ data: unidades }, { data: grade }] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select("id, nome, tipo_unidade, status_operacao")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_horarios_semanais")
      .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo, liberar_professor, liberar_torneio, observacoes")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true }),
  ]);

  const gradeAgrupada = new Map<
    string,
    { unidadeNome: string; total: number; dias: Map<number, { titulo: string; itens: NonNullable<typeof grade> }> }
  >();
  for (const item of grade ?? []) {
    const diaIdx = Math.min(6, Math.max(0, Number(item.dia_semana)));
    const unidade = (unidades ?? []).find((u) => u.id === item.espaco_unidade_id);
    const key = String(item.espaco_unidade_id ?? "geral");
    let grupo = gradeAgrupada.get(key);
    if (!grupo) {
      grupo = { unidadeNome: unidade?.nome ?? "Unidade", total: 0, dias: new Map() };
      gradeAgrupada.set(key, grupo);
    }
    let diaGrupo = grupo.dias.get(diaIdx);
    if (!diaGrupo) {
      diaGrupo = { titulo: DIAS_SEMANA_CURTO[diaIdx] ?? `Dia ${item.dia_semana}`, itens: [] };
      grupo.dias.set(diaIdx, diaGrupo);
    }
    diaGrupo.itens.push(item);
    grupo.total += 1;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-eid-primary-500/20 bg-eid-card/95 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Grade fixa</p>
        <h2 className="mt-1 text-xl font-black text-eid-fg">Horários padrão por dia da semana</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Configure aqui o que se repete toda semana. A agenda real de reservas fica separada em Agenda.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <details open className="group overflow-hidden rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
              <span>
                <span className="block text-base font-black text-eid-fg">Adicionar nova quadra ou grade</span>
                <span className="mt-1 block text-xs text-eid-text-secondary">
                  Gere vários horários de uma vez ou crie um horário avulso.
                </span>
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 text-lg font-black text-eid-primary-300 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="space-y-5 border-t border-eid-primary-500/20 p-4">
              <form action={criarGradeAutomaticaEspacoAction} className="grid gap-3">
                <h3 className="text-sm font-black text-eid-fg">Assistente automático</h3>
                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark rounded-xl px-3 py-3 text-sm">
                  {(unidades ?? []).map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
                <select name="modo_reserva_horario" defaultValue="mista" className="eid-input-dark rounded-xl px-3 py-3 text-sm">
                  <option value="mista">Aceita paga ou grátis</option>
                  <option value="paga">Somente reserva paga</option>
                  <option value="gratuita">Somente reserva gratuita</option>
                </select>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input type="time" name="segsex_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                  <input type="time" name="segsex_hora_fim" defaultValue="18:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                  <input type="number" name="intervalo_minutos" defaultValue={60} min={15} max={240} className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                </div>
                <div className="grid gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3 text-xs text-eid-text-secondary">
                  <label className="inline-flex items-center gap-2 text-eid-fg">
                    <input type="checkbox" name="sabado_diferente" />
                    Sábado com horário diferente
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="time" name="sabado_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                    <input type="time" name="sabado_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                  </div>
                  <label className="inline-flex items-center gap-2 text-eid-fg">
                    <input type="checkbox" name="domingo_diferente" />
                    Domingo com horário diferente
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="time" name="domingo_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                    <input type="time" name="domingo_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                  </div>
                  <label className="inline-flex items-center gap-2 text-eid-fg">
                    <input type="checkbox" name="limpar_grade_existente" />
                    Limpar grade existente nos dias gerados
                  </label>
                </div>
                <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Gerar grade automática</button>
              </form>

              <div className="border-t border-[color:var(--eid-border-subtle)]" />

              <form action={criarHorarioSemanalEspacoAction} className="grid gap-3">
                <h3 className="text-sm font-black text-eid-fg">Horário avulso</h3>
                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark rounded-xl px-3 py-3 text-sm">
                  {(unidades ?? []).map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select name="dia_semana" defaultValue="1" className="eid-input-dark rounded-xl px-3 py-3 text-sm">
                    <option value="0">Domingo</option>
                    <option value="1">Segunda</option>
                    <option value="2">Terça</option>
                    <option value="3">Quarta</option>
                    <option value="4">Quinta</option>
                    <option value="5">Sexta</option>
                    <option value="6">Sábado</option>
                  </select>
                  <input type="time" name="hora_inicio" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                  <input type="time" name="hora_fim" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                </div>
                <select name="modo_reserva_horario" defaultValue="mista" className="eid-input-dark rounded-xl px-3 py-3 text-sm">
                  <option value="mista">Aceita reserva paga ou grátis</option>
                  <option value="paga">Somente reserva paga</option>
                  <option value="gratuita">Somente reserva gratuita</option>
                </select>
                <textarea name="observacoes" rows={2} placeholder="Observação interna" className="eid-input-dark rounded-xl px-3 py-3 text-sm" />
                <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Adicionar horário</button>
              </form>
            </div>
          </details>
        </div>

        <div className="space-y-3">
          {Array.from(gradeAgrupada.values()).length ? (
            Array.from(gradeAgrupada.values()).map((grupo, grupoIndex) => (
              <details key={grupo.unidadeNome} open={grupoIndex === 0} className="group overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                  <span>
                    <span className="block text-base font-black text-eid-fg">{grupo.unidadeNome}</span>
                    <span className="mt-1 block text-xs text-eid-text-secondary">{grupo.total} horário(s) configurado(s)</span>
                  </span>
                  <span className="text-lg font-black text-eid-primary-300 transition group-open:rotate-45">+</span>
                </summary>
                <div className="space-y-2 border-t border-[color:var(--eid-border-subtle)] p-3">
                  {Array.from(grupo.dias.entries()).map(([dia, diaGrupo]) => (
                    <details key={dia} className="group/dia overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:hidden">
                        <span className="text-sm font-black text-eid-fg">{diaGrupo.titulo}</span>
                        <span className="text-xs font-bold text-eid-text-secondary">{diaGrupo.itens.length} horário(s)</span>
                      </summary>
                      <div className="grid gap-2 border-t border-[color:var(--eid-border-subtle)] p-3">
                        {diaGrupo.itens.map((item) => {
                          const meta = parseHorarioObservacoes(item.observacoes);
                          return (
                            <article key={item.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-eid-fg">
                                    {String(item.hora_inicio).slice(0, 5)} às {String(item.hora_fim).slice(0, 5)}
                                  </p>
                                  <p className="mt-1 text-xs text-eid-text-secondary">
                                    {item.ativo ? "Ativo" : "Desativado"} · {modoLabel(meta.modoReserva)}
                                  </p>
                                </div>
                                <form action={removerHorarioSemanalEspacoAction}>
                                  <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                  <input type="hidden" name="horario_id" value={item.id} />
                                  <button className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300">
                                    Remover
                                  </button>
                                </form>
                              </div>
                              <form action={atualizarHorarioSemanalEspacoAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                <input type="hidden" name="horario_id" value={item.id} />
                                <select name="modo_reserva_horario" defaultValue={meta.modoReserva} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                                  <option value="mista">Paga ou grátis</option>
                                  <option value="paga">Somente paga</option>
                                  <option value="gratuita">Somente gratuita</option>
                                </select>
                                <select name="ativo" defaultValue={item.ativo ? "true" : "false"} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                                  <option value="true">Ativo</option>
                                  <option value="false">Desativado</option>
                                </select>
                                <textarea name="observacoes" rows={2} defaultValue={meta.texto} className="eid-input-dark rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                                <div className="grid gap-2 text-xs text-eid-text-secondary sm:col-span-2 sm:grid-cols-2">
                                  <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" name="liberar_professor" defaultChecked={Boolean(item.liberar_professor)} />
                                    Professor
                                  </label>
                                  <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" name="liberar_torneio" defaultChecked={Boolean(item.liberar_torneio)} />
                                    Torneio
                                  </label>
                                </div>
                                <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300 sm:col-span-2">
                                  Salvar
                                </button>
                              </form>
                            </article>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 text-sm text-eid-text-secondary">
              Nenhum horário fixo cadastrado.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
