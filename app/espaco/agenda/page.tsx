import {
  adicionarVisitanteReservaEspacoAction,
  alterarStatusPunicaoMembroEspacoAction,
  criarGradeAutomaticaEspacoAction,
  criarBloqueioEspacoAction,
  criarHorarioSemanalEspacoAction,
  criarSobreposicaoFeriadoEspacoAction,
  denunciarNoShowReservaEspacoAction,
  removerBloqueioEspacoAction,
  removerHorarioSemanalEspacoAction,
  salvarPunicaoMembroEspacoAction,
  atualizarOperacaoFeriadoEspacoAction,
  sincronizarFeriadosEspacoAction,
} from "@/app/espaco/actions";
import { ReservaDetalhesModal } from "@/components/espaco/reserva-detalhes-modal";
import Image from "next/image";
import Link from "next/link";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { resumoDisponibilidadeDia } from "@/lib/espacos/calendar";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
type ParticipanteReserva = {
  id: number;
  reserva_quadra_id: number;
  papel: string;
  usuario_id: string | null;
  profiles:
    | { id?: string; nome?: string | null; username?: string | null; avatar_url?: string | null }
    | Array<{ id?: string; nome?: string | null; username?: string | null; avatar_url?: string | null }>
    | null;
};

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

export default async function EspacoAgendaPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/agenda",
    espacoId,
  });

  const [
    { data: unidades },
    { data: grade },
    { data: bloqueios },
    { data: reservas },
    { data: feriados },
    { data: feriadosCache },
    { data: punicoes },
  ] =
    await Promise.all([
      supabase
        .from("espaco_unidades")
        .select("id, nome, tipo_unidade, status_operacao")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("espaco_horarios_semanais")
        .select(
          "id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo, liberar_professor, liberar_torneio, liberar_para_usuario_id"
        )
        .eq("espaco_generico_id", selectedSpace.id)
        .order("dia_semana", { ascending: true }),
      supabase
        .from("espaco_bloqueios")
        .select("id, espaco_unidade_id, titulo, inicio, fim, tipo_bloqueio")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("inicio", { ascending: true }),
      supabase
        .from("reservas_quadra")
        .select(
          "id, espaco_unidade_id, inicio, fim, status_reserva, tipo_reserva, usuario_solicitante_id, partida_id, torneio_jogo_id, professor_aula_id"
        )
        .eq("espaco_generico_id", selectedSpace.id)
        .order("inicio", { ascending: true }),
      supabase
        .from("espaco_feriados_personalizados")
        .select("id, nome, data_inicio, data_fim, operar_no_feriado, sobrepor_grade")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("data_inicio", { ascending: true }),
      supabase
        .from("espaco_feriados_cache")
        .select("id, ano, fonte, payload_json, atualizado_em")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ano", { ascending: false }),
      supabase
        .from("espaco_punicoes_membro")
        .select("id, usuario_id, tipo_punicao, status, motivo, inicio_em, fim_em")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("id", { ascending: false })
        .limit(30),
    ]);
  const reservaIds = (reservas ?? []).map((item) => Number(item.id));
  const solicitanteIds = [...new Set((reservas ?? []).map((item) => String(item.usuario_solicitante_id ?? "")).filter(Boolean))];
  const [{ data: solicitantes }, { data: participantes }] = await Promise.all([
    solicitanteIds.length
      ? supabase.from("profiles").select("id, nome, username, avatar_url").in("id", solicitanteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; username: string | null; avatar_url: string | null }> }),
    reservaIds.length
      ? supabase
          .from("espaco_reserva_participantes")
          .select("id, reserva_quadra_id, papel, usuario_id, profiles(id, nome, username, avatar_url)")
          .in("reserva_quadra_id", reservaIds)
          .neq("papel", "titular")
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);
  const solicitanteById = new Map((solicitantes ?? []).map((p) => [String(p.id), p]));
  const partidaIds = [...new Set((reservas ?? []).map((item) => Number(item.partida_id ?? 0)).filter((id) => id > 0))];
  const torneioJogoIds = [...new Set((reservas ?? []).map((item) => Number(item.torneio_jogo_id ?? 0)).filter((id) => id > 0))];
  const professorAulaIds = [...new Set((reservas ?? []).map((item) => Number(item.professor_aula_id ?? 0)).filter((id) => id > 0))];
  const [{ data: partidas }, { data: torneioJogos }, { data: professorAulas }] = await Promise.all([
    partidaIds.length
      ? supabase
          .from("partidas")
          .select("id, status, placar, data_partida, data_resultado")
          .in("id", partidaIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    torneioJogoIds.length
      ? supabase
          .from("torneio_jogos")
          .select("id, status, placar_json, horario_inicio, observacoes")
          .in("id", torneioJogoIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    professorAulaIds.length
      ? supabase
          .from("professor_aulas")
          .select("id, status, titulo, inicio, fim")
          .in("id", professorAulaIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);
  const partidaById = new Map((partidas ?? []).map((item) => [Number(item.id), item]));
  const torneioJogoById = new Map((torneioJogos ?? []).map((item) => [Number(item.id), item]));
  const professorAulaById = new Map((professorAulas ?? []).map((item) => [Number(item.id), item]));
  const participantesByReserva = new Map<number, ParticipanteReserva[]>();
  for (const item of (participantes ?? []) as ParticipanteReserva[]) {
    const reservaId = Number(item.reserva_quadra_id ?? 0);
    if (!participantesByReserva.has(reservaId)) participantesByReserva.set(reservaId, []);
    participantesByReserva.get(reservaId)?.push(item);
  }

  const hojeResumo = resumoDisponibilidadeDia({
    date: new Date(),
    grade: (grade ?? []).map((item) => ({
      dia_semana: Number(item.dia_semana),
      hora_inicio: String(item.hora_inicio),
      hora_fim: String(item.hora_fim),
      ativo: Boolean(item.ativo),
    })),
    reservas: (reservas ?? []).map((item) => ({
      id: item.id,
      inicio: String(item.inicio),
      fim: String(item.fim),
      status_reserva: item.status_reserva,
    })),
    bloqueios: (bloqueios ?? []).map((item) => ({
      inicio: String(item.inicio),
      fim: String(item.fim),
      titulo: item.titulo,
    })),
    feriadosCustom: (feriados ?? []).map((item) => ({
      data_inicio: String(item.data_inicio),
      data_fim: String(item.data_fim),
    })),
    feriadosAutomaticos: [],
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-4">
        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Grade semanal</h2>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Hoje: {hojeResumo.aberto ? "aberto" : "fechado"} · {hojeResumo.motivo}
          </p>
          <div className="eid-mobile-subsection mt-4 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/5 p-3">
            <h3 className="text-sm font-bold text-eid-fg">Assistente automático de horários</h3>
            <p className="mt-1 text-xs text-eid-text-secondary">
              Informe o funcionamento da unidade e o intervalo (ex.: 1h). O sistema gera todos os slots automaticamente para semana, sábado e domingo.
            </p>
            <form action={criarGradeAutomaticaEspacoAction} className="mt-3 grid gap-2">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />
              <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                {(unidades ?? []).map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-3">
                <input type="time" name="segsex_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="time" name="segsex_hora_fim" defaultValue="18:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="number" name="intervalo_minutos" defaultValue={60} min={15} max={240} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-eid-fg">
                <input type="checkbox" name="sabado_diferente" />
                Sábado com horário diferente
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="time" name="sabado_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="time" name="sabado_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-eid-fg">
                <input type="checkbox" name="domingo_diferente" />
                Domingo com horário diferente
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="time" name="domingo_hora_inicio" defaultValue="08:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="time" name="domingo_hora_fim" defaultValue="12:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-eid-fg">
                <input type="checkbox" name="limpar_grade_existente" />
                Limpar grade existente da unidade nos dias gerados antes de criar
              </label>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-eid-fg">
                  <input type="checkbox" name="feriados_automaticos_ativos" />
                  Ligar feriados automáticos e sobrepor a grade
                </label>
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  Quando ligado, o sistema já cria os feriados do ano e aplica por cima da grade. Depois você escolhe abrir ou fechar em cada feriado.
                </p>
                <select
                  name="feriado_operacao_padrao"
                  defaultValue="fechado"
                  className="eid-input-dark mt-2 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="fechado">Padrão: fechar no feriado</option>
                  <option value="aberto">Padrão: abrir no feriado</option>
                </select>
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-eid-fg">
                  <input type="checkbox" name="aplicar_regras_agora" />
                  Já aplicar regras de reserva nessa etapa (deixa tudo pronto)
                </label>
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  Use para configurar limites e benefício grátis de membros sem precisar voltar em outra tela.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    name="regra_limite_dia"
                    defaultValue={1}
                    min={0}
                    placeholder="Limite geral/dia"
                    className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="regra_limite_semana"
                    defaultValue={3}
                    min={0}
                    placeholder="Limite geral/semana"
                    className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="regra_cooldown_horas"
                    defaultValue={2}
                    min={0}
                    placeholder="Cooldown (h)"
                    className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="regra_antecedencia_min_horas"
                    defaultValue={1}
                    min={0}
                    placeholder="Antecedência mínima (h)"
                    className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="regra_antecedencia_max_dias"
                    defaultValue={30}
                    min={1}
                    placeholder="Antecedência máxima (dias)"
                    className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-2 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-2.5">
                  <label className="inline-flex items-center gap-2 text-xs text-eid-fg">
                    <input type="checkbox" name="regra_reservas_gratis_liberadas" />
                    Permitir reserva grátis para membros
                  </label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      name="regra_gratis_limite_dia"
                      defaultValue={1}
                      min={0}
                      placeholder="Grátis por dia"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      name="regra_gratis_limite_semana"
                      defaultValue={3}
                      min={0}
                      placeholder="Grátis por semana"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      name="regra_gratis_intervalo_horas"
                      defaultValue={2}
                      min={0}
                      placeholder="Intervalo grátis (h)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      name="regra_gratis_antecedencia_max_dias"
                      defaultValue={30}
                      min={1}
                      placeholder="Antecedência grátis (dias)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-bold text-eid-primary-300">
                Gerar grade automática
              </button>
            </form>
          </div>
          <form action={criarHorarioSemanalEspacoAction} className="mt-4 grid gap-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <select
              name="espaco_unidade_id"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              defaultValue={unidades?.[0]?.id ?? ""}
            >
              {(unidades ?? []).map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                name="dia_semana"
                defaultValue="1"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              >
                <option value="0">Dom</option>
                <option value="1">Seg</option>
                <option value="2">Ter</option>
                <option value="3">Qua</option>
                <option value="4">Qui</option>
                <option value="5">Sex</option>
                <option value="6">Sab</option>
              </select>
              <input type="time" name="hora_inicio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input type="time" name="hora_fim" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            </div>
            <textarea
              name="observacoes"
              rows={2}
              placeholder="Observações"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3 text-xs text-eid-text-secondary sm:grid-cols-2">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="liberar_professor" />
                Liberar este horário para professor
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="liberar_torneio" />
                Liberar este horário para organizador de torneio
              </label>
              <input
                name="liberar_para_username"
                placeholder="Opcional: @username específico"
                className="eid-input-dark rounded-xl px-3 py-2 text-xs sm:col-span-2"
              />
            </div>
            <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
              Adicionar à grade
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(grade ?? []).map((item) => {
              const diaIdx = Math.min(6, Math.max(0, Number(item.dia_semana)));
              const unidade = (unidades ?? []).find((u) => u.id === item.espaco_unidade_id);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-eid-text-secondary">
                    <span className="font-semibold text-eid-fg">
                      {DIAS_SEMANA_CURTO[diaIdx] ?? `Dia ${item.dia_semana}`}
                    </span>
                    {" · "}
                    {String(item.hora_inicio).slice(0, 5)} às {String(item.hora_fim).slice(0, 5)}
                    {unidade ? ` · ${unidade.nome}` : ""}
                    {!item.ativo ? " · inativo" : ""}
                    {item.liberar_professor ? " · liberado professor" : ""}
                    {item.liberar_torneio ? " · liberado torneio" : ""}
                  </p>
                  <form action={removerHorarioSemanalEspacoAction} className="shrink-0">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="horario_id" value={item.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 sm:w-auto"
                    >
                      Remover
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>

        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Bloqueios</h2>
          <div className="eid-mobile-subsection mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
            <h3 className="text-sm font-bold text-eid-fg">Sobreposição de feriado na grade</h3>
            <p className="mt-1 text-xs text-eid-text-secondary">
              Aplique um horário de feriado por cima da grade padrão. Depois você pode editar ou remover normalmente no bloco de bloqueios.
            </p>
            <form action={criarSobreposicaoFeriadoEspacoAction} className="mt-3 grid gap-2">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />
              <select name="espaco_unidade_id" defaultValue={unidades?.[0]?.id ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                {(unidades ?? []).map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="date" name="feriado_data_inicio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="date" name="feriado_data_fim" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="time" name="feriado_hora_inicio" defaultValue="00:00" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input type="time" name="feriado_hora_fim" defaultValue="23:59" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <input name="feriado_titulo" defaultValue="Feriado (sobreposição)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <button className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200">
                Aplicar sobreposição de feriado
              </button>
            </form>
          </div>
          <form action={criarBloqueioEspacoAction} className="mt-4 grid gap-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <select
              name="espaco_unidade_id"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              defaultValue={unidades?.[0]?.id ?? ""}
            >
              {(unidades ?? []).map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
            <input name="titulo" placeholder="Título do bloqueio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="datetime-local" name="inicio" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input type="datetime-local" name="fim" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            </div>
            <input name="tipo_bloqueio" defaultValue="manutencao" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <textarea name="motivo" rows={2} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <button className="rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-3 text-sm font-bold text-eid-action-400">
              Criar bloqueio
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(bloqueios ?? []).length ? (
              (bloqueios ?? []).map((b) => {
                const unidade = (unidades ?? []).find((u) => u.id === b.espaco_unidade_id);
                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-xs sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-eid-fg">{b.titulo}</p>
                      <p className="mt-1 text-eid-text-secondary">
                        {b.inicio ? new Date(b.inicio).toLocaleString("pt-BR") : "-"} →{" "}
                        {b.fim ? new Date(b.fim).toLocaleString("pt-BR") : "-"}
                      </p>
                      <p className="mt-1 text-eid-text-secondary">
                        {unidade?.nome ?? "Todas"} · {b.tipo_bloqueio}
                      </p>
                    </div>
                    <form action={removerBloqueioEspacoAction} className="shrink-0">
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="bloqueio_id" value={b.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 sm:w-auto"
                      >
                        Remover
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhum bloqueio cadastrado.</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Punições de marcação (membros)</h2>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Use quando uma denúncia for aprovada. Você pode aplicar por 1 semana, 1 mês ou sem prazo, e depois editar/suspender.
          </p>
          <form action={salvarPunicaoMembroEspacoAction} className="mt-4 grid gap-2">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <input name="alvo_usuario_id" placeholder="ID do usuário punido" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <select name="periodo" defaultValue="1_semana" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
              <option value="1_semana">Suspensão por 1 semana</option>
              <option value="1_mes">Suspensão por 1 mês</option>
              <option value="sem_prazo">Suspensão sem prazo</option>
            </select>
            <input name="denuncia_id" placeholder="ID da denúncia aprovada (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <textarea name="motivo" rows={2} placeholder="Motivo da punição" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <button className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              Aplicar punição
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(punicoes ?? []).map((item) => {
              const alvo = solicitanteById.get(String(item.usuario_id ?? ""));
              return (
                <div key={item.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                  <p className="text-sm font-semibold text-eid-fg">
                    {alvo?.nome ?? item.usuario_id} · {item.tipo_punicao}
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Status {item.status} · início {item.inicio_em ? new Date(item.inicio_em).toLocaleDateString("pt-BR") : "-"} · fim{" "}
                    {item.fim_em ? new Date(item.fim_em).toLocaleDateString("pt-BR") : "sem prazo"}
                  </p>
                  {item.motivo ? <p className="mt-1 text-xs text-eid-text-secondary">{item.motivo}</p> : null}
                  <form action={salvarPunicaoMembroEspacoAction} className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="punicao_id" value={item.id} />
                    <input type="hidden" name="alvo_usuario_id" value={String(item.usuario_id ?? "")} />
                    <select
                      name="periodo"
                      defaultValue={item.fim_em ? "1_mes" : "sem_prazo"}
                      className="eid-input-dark rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="1_semana">Ajustar para 1 semana</option>
                      <option value="1_mes">Ajustar para 1 mês</option>
                      <option value="sem_prazo">Ajustar para sem prazo</option>
                    </select>
                    <input
                      name="motivo"
                      defaultValue={item.motivo ?? ""}
                      placeholder="Editar motivo"
                      className="eid-input-dark rounded-xl px-3 py-2 text-xs sm:col-span-2"
                    />
                    <button className="w-fit rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-eid-fg">
                      Salvar edição
                    </button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={alterarStatusPunicaoMembroEspacoAction}>
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="punicao_id" value={item.id} />
                      <input type="hidden" name="status" value="suspensa" />
                      <button className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200">
                        Suspender punição
                      </button>
                    </form>
                    <form action={alterarStatusPunicaoMembroEspacoAction}>
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="punicao_id" value={item.id} />
                      <input type="hidden" name="status" value="ativa" />
                      <button className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-[11px] font-semibold text-eid-primary-300">
                        Reativar
                      </button>
                    </form>
                    <form action={alterarStatusPunicaoMembroEspacoAction}>
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="punicao_id" value={item.id} />
                      <input type="hidden" name="status" value="encerrada" />
                      <button className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-eid-fg">
                        Encerrar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Reservas recentes</h2>
          <div className="mt-4 space-y-2">
            {(reservas ?? []).length ? (
              (reservas ?? []).map((item) => {
                const unidade = (unidades ?? []).find((un) => un.id === item.espaco_unidade_id);
                const solicitante = solicitanteById.get(String(item.usuario_solicitante_id ?? ""));
                const visitantes = participantesByReserva.get(Number(item.id)) ?? [];
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                  >
                    <p className="text-sm font-semibold text-eid-fg">
                      {unidade?.nome ?? "Unidade"} · {item.tipo_reserva}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {item.inicio ? new Date(item.inicio).toLocaleString("pt-BR") : "-"} até{" "}
                      {item.fim ? new Date(item.fim).toLocaleString("pt-BR") : "-"}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Status {item.status_reserva}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.partida_id ? (
                        <ReservaDetalhesModal
                          tituloBotao="Detalhes jogo de rank"
                          titulo={`Partida #${item.partida_id}`}
                          linhas={[
                            { label: "Status", valor: String(partidaById.get(Number(item.partida_id))?.status ?? "-") },
                            { label: "Resultado", valor: String(partidaById.get(Number(item.partida_id))?.placar ?? "-") },
                            {
                              label: "Data da partida",
                              valor: partidaById.get(Number(item.partida_id))?.data_partida
                                ? new Date(String(partidaById.get(Number(item.partida_id))?.data_partida)).toLocaleString("pt-BR")
                                : "-",
                            },
                          ]}
                        />
                      ) : null}
                      {item.torneio_jogo_id ? (
                        <ReservaDetalhesModal
                          tituloBotao="Detalhes jogo de torneio"
                          titulo={`Jogo #${item.torneio_jogo_id}`}
                          linhas={[
                            { label: "Status", valor: String(torneioJogoById.get(Number(item.torneio_jogo_id))?.status ?? "-") },
                            {
                              label: "Resultado",
                              valor: String(torneioJogoById.get(Number(item.torneio_jogo_id))?.placar_json ?? "-"),
                            },
                            {
                              label: "Horário",
                              valor: torneioJogoById.get(Number(item.torneio_jogo_id))?.horario_inicio
                                ? new Date(String(torneioJogoById.get(Number(item.torneio_jogo_id))?.horario_inicio)).toLocaleString("pt-BR")
                                : "-",
                            },
                          ]}
                        />
                      ) : null}
                      {item.professor_aula_id ? (
                        <ReservaDetalhesModal
                          tituloBotao="Detalhes da aula"
                          titulo={`Aula #${item.professor_aula_id}`}
                          linhas={[
                            { label: "Título", valor: String(professorAulaById.get(Number(item.professor_aula_id))?.titulo ?? "-") },
                            { label: "Status", valor: String(professorAulaById.get(Number(item.professor_aula_id))?.status ?? "-") },
                            {
                              label: "Início",
                              valor: professorAulaById.get(Number(item.professor_aula_id))?.inicio
                                ? new Date(String(professorAulaById.get(Number(item.professor_aula_id))?.inicio)).toLocaleString("pt-BR")
                                : "-",
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                    {solicitante?.id ? (
                      <Link
                        href={`/perfil/${solicitante.id}?from=/espaco/agenda`}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-2.5 py-1.5 text-xs text-eid-fg"
                      >
                        {solicitante.avatar_url ? (
                          <Image
                            src={solicitante.avatar_url}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-eid-primary-500/15 text-[10px] font-bold text-eid-primary-300">
                            {(solicitante.nome ?? "U").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span>{solicitante.nome ?? "Reservante"}</span>
                      </Link>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visitantes.map((v) => {
                        const profileRaw = v.profiles;
                        const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
                        return profile?.id ? (
                          <Link
                            key={String(v.id)}
                            href={`/perfil/${profile.id}?from=/espaco/agenda`}
                            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-1 text-[11px] text-eid-fg"
                          >
                            {profile.avatar_url ? (
                              <Image
                                src={profile.avatar_url}
                                alt=""
                                width={18}
                                height={18}
                                unoptimized
                                className="h-[18px] w-[18px] rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-eid-primary-500/15 text-[9px] font-bold text-eid-primary-300">
                                {(profile.nome ?? "V").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span>{profile.nome ?? "Visitante"}</span>
                          </Link>
                        ) : null;
                      })}
                    </div>
                    <form action={adicionarVisitanteReservaEspacoAction} className="mt-3 flex gap-2">
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="reserva_id" value={item.id} />
                      <input
                        name="visitante_username"
                        placeholder="@username do visitante"
                        className="eid-input-dark min-w-0 flex-1 rounded-xl px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
                      >
                        Adicionar visitante
                      </button>
                    </form>
                    <form action={denunciarNoShowReservaEspacoAction} className="mt-2 grid gap-2">
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="reserva_id" value={item.id} />
                      <input type="hidden" name="alvo_usuario_id" value={String(item.usuario_solicitante_id ?? "")} />
                      <input
                        name="detalhe"
                        placeholder="Detalhe do no-show (opcional)"
                        className="eid-input-dark rounded-xl px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="w-fit rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300"
                      >
                        Denunciar no-show
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">
                Nenhuma reserva registrada ainda.
              </p>
            )}
          </div>
        </div>

        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Feriados personalizados</h2>
          <form action={sincronizarFeriadosEspacoAction} className="mt-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <input type="hidden" name="ano" value={new Date().getFullYear()} />
            <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-bold text-eid-primary-300">
              Sincronizar feriados automáticos
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(feriados ?? []).length ? (
              (feriados ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                >
                  <p className="text-sm font-semibold text-eid-fg">{item.nome}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    {String(item.data_inicio)} até {String(item.data_fim)}
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Operação: {item.operar_no_feriado ? "aberto" : "fechado"} · sobreposição da grade:{" "}
                    {item.sobrepor_grade ? "ativa" : "desligada"}
                  </p>
                  <form action={atualizarOperacaoFeriadoEspacoAction} className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="feriado_id" value={item.id} />
                    <select
                      name="operar_no_feriado"
                      defaultValue={item.operar_no_feriado ? "sim" : "nao"}
                      className="eid-input-dark rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="nao">Fechar nesse feriado</option>
                      <option value="sim">Abrir nesse feriado</option>
                    </select>
                    <select
                      name="sobrepor_grade"
                      defaultValue={item.sobrepor_grade ? "sim" : "nao"}
                      className="eid-input-dark rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="sim">Sobrepor grade</option>
                      <option value="nao">Não sobrepor grade</option>
                    </select>
                    <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-semibold text-eid-primary-300">
                      Salvar feriado
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">
                Nenhum feriado personalizado cadastrado ainda.
              </p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {(feriadosCache ?? []).map((item) => {
              const total = Array.isArray(item.payload_json) ? item.payload_json.length : 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                >
                  <p className="text-sm font-semibold text-eid-fg">
                    Cache {item.ano} · {item.fonte}
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    {total} feriado(s) sincronizados · atualizado em{" "}
                    {item.atualizado_em
                      ? new Date(item.atualizado_em).toLocaleString("pt-BR")
                      : "-"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
