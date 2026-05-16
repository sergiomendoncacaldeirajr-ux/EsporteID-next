import {
  criarGradeAutomaticaEspacoAction,
  criarHorarioSemanalEspacoAction,
} from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { GradeAdminView } from "@/components/espaco/grade-admin-view";
import type { SlotAdmin, UnidadeAdmin } from "@/components/espaco/grade-admin-view";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

export default async function EspacoGradePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/grade",
    espacoId,
  });

  const [{ data: unidadesRaw }, { data: gradeRaw }] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select("id, nome, tipo_unidade, logo_arquivo, status_operacao")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_horarios_semanais")
      .select(
        "id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo, liberar_professor, liberar_torneio, observacoes"
      )
      .eq("espaco_generico_id", selectedSpace.id)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true }),
  ]);

  const unidades: UnidadeAdmin[] = (unidadesRaw ?? []).map((u) => ({
    id: u.id,
    nome: u.nome,
    tipo_unidade: u.tipo_unidade ?? null,
    logo_arquivo: (u as { logo_arquivo?: string | null }).logo_arquivo ?? null,
    status_operacao: u.status_operacao ?? null,
  }));

  const slots: SlotAdmin[] = (gradeRaw ?? []).map((s) => ({
    id: s.id,
    espaco_unidade_id: s.espaco_unidade_id ?? null,
    dia_semana: Number(s.dia_semana),
    hora_inicio: String(s.hora_inicio),
    hora_fim: String(s.hora_fim),
    ativo: Boolean(s.ativo),
    liberar_professor: s.liberar_professor ?? null,
    liberar_torneio: s.liberar_torneio ?? null,
    observacoes: s.observacoes ?? null,
  }));

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

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        {/* ── Left: creation forms ────────────────────────────────── */}
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
                <select
                  name="espaco_unidade_id"
                  defaultValue={unidadesRaw?.[0]?.id ?? ""}
                  className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                >
                  {(unidadesRaw ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
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
                <select
                  name="espaco_unidade_id"
                  defaultValue={unidadesRaw?.[0]?.id ?? ""}
                  className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                >
                  {(unidadesRaw ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-eid-text-secondary">Dia da semana</label>
                <select name="dia_semana" defaultValue="1" className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm">
                  {DIAS_SEMANA.map((nome, idx) => (
                    <option key={idx} value={idx}>
                      {nome}
                    </option>
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

              <textarea
                name="observacoes"
                rows={2}
                placeholder="Observação interna (opcional)"
                className="eid-input-dark w-full rounded-xl px-3 py-2.5 text-sm"
              />

              <button className="w-full rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
                Adicionar horário
              </button>
            </form>
          </details>
        </div>

        {/* ── Right: grade visualisation (client) ─────────────────── */}
        <GradeAdminView
          espacoId={selectedSpace.id}
          unidades={unidades}
          slots={slots}
        />
      </div>
    </div>
  );
}
