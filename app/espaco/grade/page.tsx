import {
  atualizarHorarioSemanalEspacoAction,
  criarGradeAutomaticaEspacoAction,
  criarHorarioSemanalEspacoAction,
  removerHorarioSemanalEspacoAction,
} from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

function parseObservacoes(raw: unknown): string {
  const linhas = String(raw ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !l.trim().startsWith("[eid-horario]"));
  return linhas.join("\n").trim();
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

  // Agrupar por unidade → dia da semana
  type SlotItem = NonNullable<typeof grade>[number];
  type DiaGrupo = { dia: number; itens: SlotItem[] };
  type UnidadeGrupo = { id: number | null; nome: string; dias: DiaGrupo[] };

  const unidadeMap = new Map<string, UnidadeGrupo>();
  for (const item of grade ?? []) {
    const diaIdx = Math.min(6, Math.max(0, Number(item.dia_semana)));
    const key = String(item.espaco_unidade_id ?? "geral");
    if (!unidadeMap.has(key)) {
      const u = (unidades ?? []).find((u) => u.id === item.espaco_unidade_id);
      unidadeMap.set(key, { id: item.espaco_unidade_id ?? null, nome: u?.nome ?? "Sem quadra", dias: [] });
    }
    const grupo = unidadeMap.get(key)!;
    let diaGrupo = grupo.dias.find((d) => d.dia === diaIdx);
    if (!diaGrupo) {
      diaGrupo = { dia: diaIdx, itens: [] };
      grupo.dias.push(diaGrupo);
    }
    diaGrupo.itens.push(item);
  }
  const grupos = Array.from(unidadeMap.values());

  const modoEspaco = selectedSpace.modo_reserva === "paga" ? "Pagas" : "Gratuitas";

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border border-eid-primary-500/20 bg-eid-card/95 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Grade fixa</p>
        <h2 className="mt-1 text-xl font-black text-eid-fg">Horários por quadra e dia da semana</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Configure o que se repete toda semana. O tipo de reserva (<strong>{modoEspaco}</strong>) é definido pelo plano do espaço.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Painel de criação */}
        <div className="space-y-4">
          {/* Gerador automático */}
          <details open className="group overflow-hidden rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
              <span>
                <span className="block text-base font-black text-eid-fg">Gerar grade automática</span>
                <span className="mt-0.5 block text-xs text-eid-text-secondary">
                  Cria vários horários de uma vez por intervalo.
                </span>
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 text-lg font-black text-eid-primary-300 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <form action={criarGradeAutomaticaEspacoAction} className="space-y-3 border-t border-eid-primary-500/20 p-4">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Quadra</label>
                <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm">
                  {(unidades ?? []).map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Seg–Sex</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="time" name="segsex_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
                  <input type="time" name="segsex_hora_fim" defaultValue="18:00" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
                  <div>
                    <input type="number" name="intervalo_minutos" defaultValue={60} min={15} max={240} className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm" />
                    <p className="mt-0.5 text-[10px] text-eid-text-secondary">min/slot</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
                <label className="flex items-center gap-2 text-sm text-eid-fg">
                  <input type="checkbox" name="sabado_diferente" className="accent-eid-primary-500" />
                  Sábado com horário diferente
                </label>
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <input type="time" name="sabado_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="time" name="sabado_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm text-eid-fg">
                  <input type="checkbox" name="domingo_diferente" className="accent-eid-primary-500" />
                  Domingo com horário diferente
                </label>
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <input type="time" name="domingo_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="time" name="domingo_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm text-eid-text-secondary">
                  <input type="checkbox" name="limpar_grade_existente" className="accent-red-500" />
                  Apagar slots existentes nos dias gerados
                </label>
              </div>

              <button className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold">
                Gerar grade
              </button>
            </form>
          </details>

          {/* Horário avulso */}
          <details className="group overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
              <span>
                <span className="block text-base font-black text-eid-fg">Adicionar horário avulso</span>
                <span className="mt-0.5 block text-xs text-eid-text-secondary">
                  Um slot específico em um dia da semana.
                </span>
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-lg font-black text-eid-fg/50 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <form action={criarHorarioSemanalEspacoAction} className="space-y-3 border-t border-[color:var(--eid-border-subtle)] p-4">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Quadra</label>
                <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm">
                  {(unidades ?? []).map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Dia da semana</label>
                <select name="dia_semana" defaultValue="1" className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm">
                  {DIAS_SEMANA.map((nome, idx) => (
                    <option key={idx} value={idx}>{nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Faixa de horário</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" name="hora_inicio" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
                  <input type="time" name="hora_fim" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
                <label className="flex items-center gap-2 text-sm text-eid-fg">
                  <input type="checkbox" name="liberar_professor" className="accent-eid-primary-500" />
                  Liberar para professores
                </label>
                <label className="flex items-center gap-2 text-sm text-eid-fg">
                  <input type="checkbox" name="liberar_torneio" className="accent-eid-primary-500" />
                  Liberar para torneios
                </label>
              </div>

              <textarea name="observacoes" rows={2} placeholder="Observação interna (opcional)" className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm" />

              <button className="w-full rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
                Adicionar horário
              </button>
            </form>
          </details>
        </div>

        {/* Grade por quadra */}
        <div className="space-y-3">
          {grupos.length ? (
            grupos.map((grupo, gi) => (
              <details key={String(grupo.id ?? "geral")} open={gi === 0} className="group overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                  <div>
                    <p className="text-base font-black text-eid-fg">{grupo.nome}</p>
                    <p className="mt-0.5 text-xs text-eid-text-secondary">
                      {grupo.dias.reduce((s, d) => s + d.itens.length, 0)} horário(s) configurado(s)
                    </p>
                  </div>
                  <span className="text-lg font-black text-eid-primary-300 transition group-open:rotate-45">+</span>
                </summary>

                <div className="divide-y divide-[color:var(--eid-border-subtle)] border-t border-[color:var(--eid-border-subtle)]">
                  {grupo.dias.map((diaGrupo) => (
                    <div key={diaGrupo.dia} className="p-3">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-eid-primary-300">
                        {DIAS_SEMANA_CURTO[diaGrupo.dia]}
                      </p>
                      <div className="space-y-2">
                        {diaGrupo.itens.map((item) => {
                          const notaTexto = parseObservacoes(item.observacoes);
                          return (
                            <article key={item.id} className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40">
                              {/* Header do slot */}
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-eid-fg tabular-nums">
                                    {String(item.hora_inicio).slice(0, 5)}–{String(item.hora_fim).slice(0, 5)}
                                  </span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${item.ativo ? "bg-emerald-500/15 text-emerald-300" : "bg-eid-surface/60 text-eid-text-secondary"}`}>
                                    {item.ativo ? "Ativo" : "Inativo"}
                                  </span>
                                  {item.liberar_professor && (
                                    <span className="rounded-full bg-eid-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold text-eid-primary-300">Prof</span>
                                  )}
                                  {item.liberar_torneio && (
                                    <span className="rounded-full bg-eid-action-500/15 px-1.5 py-0.5 text-[10px] font-bold text-eid-action-300">Torneio</span>
                                  )}
                                </div>
                                <form action={removerHorarioSemanalEspacoAction}>
                                  <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                  <input type="hidden" name="horario_id" value={item.id} />
                                  <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 transition hover:bg-red-500/20">
                                    ✕
                                  </button>
                                </form>
                              </div>

                              {/* Edição inline */}
                              <form action={atualizarHorarioSemanalEspacoAction} className="border-t border-[color:var(--eid-border-subtle)] px-3 pb-3 pt-2.5">
                                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                <input type="hidden" name="horario_id" value={item.id} />
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <select name="ativo" defaultValue={item.ativo ? "true" : "false"} className="eid-input-dark rounded-lg px-3 py-2 text-xs">
                                    <option value="true">Ativo</option>
                                    <option value="false">Inativo</option>
                                  </select>
                                  <div className="flex gap-3">
                                    <label className="flex items-center gap-1.5 text-xs text-eid-text-secondary">
                                      <input type="checkbox" name="liberar_professor" defaultChecked={Boolean(item.liberar_professor)} className="accent-eid-primary-500" />
                                      Prof
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-eid-text-secondary">
                                      <input type="checkbox" name="liberar_torneio" defaultChecked={Boolean(item.liberar_torneio)} className="accent-eid-primary-500" />
                                      Torneio
                                    </label>
                                  </div>
                                  <textarea
                                    name="observacoes"
                                    rows={2}
                                    defaultValue={notaTexto}
                                    placeholder="Nota interna"
                                    className="eid-input-dark rounded-lg px-2.5 py-2 text-xs sm:col-span-2"
                                  />
                                </div>
                                <button className="mt-2 w-full rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
                                  Salvar
                                </button>
                              </form>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-8 text-center">
              <p className="text-sm font-bold text-eid-fg">Nenhum horário configurado</p>
              <p className="mt-1 text-xs text-eid-text-secondary">Use o assistente ao lado para gerar a grade da semana.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
