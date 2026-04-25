import {
  criarBloqueioEspacoAction,
  criarHorarioSemanalEspacoAction,
  removerBloqueioEspacoAction,
  removerHorarioSemanalEspacoAction,
  sincronizarFeriadosEspacoAction,
} from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { resumoDisponibilidadeDia } from "@/lib/espacos/calendar";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

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

  const [{ data: unidades }, { data: grade }, { data: bloqueios }, { data: reservas }, { data: feriados }, { data: feriadosCache }] =
    await Promise.all([
      supabase
        .from("espaco_unidades")
        .select("id, nome, tipo_unidade, status_operacao")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("espaco_horarios_semanais")
        .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("dia_semana", { ascending: true }),
      supabase
        .from("espaco_bloqueios")
        .select("id, espaco_unidade_id, titulo, inicio, fim, tipo_bloqueio")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("inicio", { ascending: true }),
      supabase
        .from("reservas_quadra")
        .select("id, espaco_unidade_id, inicio, fim, status_reserva, tipo_reserva, usuario_solicitante_id")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("inicio", { ascending: true }),
      supabase
        .from("espaco_feriados_personalizados")
        .select("id, nome, data_inicio, data_fim")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("data_inicio", { ascending: true }),
      supabase
        .from("espaco_feriados_cache")
        .select("id, ano, fonte, payload_json, atualizado_em")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ano", { ascending: false }),
    ]);

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
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Grade semanal</h2>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Hoje: {hojeResumo.aberto ? "aberto" : "fechado"} · {hojeResumo.motivo}
          </p>
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

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Bloqueios</h2>
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
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Reservas recentes</h2>
          <div className="mt-4 space-y-2">
            {(reservas ?? []).length ? (
              (reservas ?? []).map((item) => {
                const unidade = (unidades ?? []).find((un) => un.id === item.espaco_unidade_id);
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

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
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
