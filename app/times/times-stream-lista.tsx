import type { SupabaseClient } from "@supabase/supabase-js";
import { TimesRecrutamentoVagasList } from "@/components/times/times-recrutamento-vagas-list";
import {
  RECRUTAMENTO_VAGAS_FETCH_LIMIT,
  type MinhasTimeShellRow,
  type RosterHeadcountBatchRow,
  type TimeListRow,
  rowToCardData,
} from "./times-vagas-shared";

export type TimesStreamListaProps = {
  supabase: SupabaseClient;
  userId: string;
  q: string;
  minhasCriadorTimes: MinhasTimeShellRow[];
};

export async function TimesStreamListaVagas({ supabase, userId, q, minhasCriadorTimes }: TimesStreamListaProps) {
  let timesListQuery = supabase
    .from("times")
    .select("id, nome, localizacao, vagas_abertas, aceita_pedidos, eid_time, nivel_procurado, escudo, tipo, criador_id, esportes(nome)")
    .eq("vagas_abertas", true)
    .eq("aceita_pedidos", true)
    .order("id", { ascending: false })
    .limit(RECRUTAMENTO_VAGAS_FETCH_LIMIT);
  if (q) {
    timesListQuery = timesListQuery.or(`nome.ilike.%${q}%,localizacao.ilike.%${q}%`);
  }

  const [{ data: filtrados }, { data: minhasCandidaturas }, { data: meusMembros }] = await Promise.all([
    timesListQuery,
    supabase.from("time_candidaturas").select("id, time_id").eq("candidato_usuario_id", userId).eq("status", "pendente"),
    supabase.from("membros_time").select("time_id").eq("usuario_id", userId).in("status", ["ativo", "aceito", "aprovado"]),
  ]);

  const lista = (filtrados ?? []) as TimeListRow[];
  const timeIds = lista.map((t) => Number(t.id)).filter((id) => Number.isFinite(id) && id > 0);
  const { data: rosterBatchRows, error: rosterBatchErr } =
    timeIds.length > 0
      ? await supabase.rpc("time_roster_headcount_many", { p_time_ids: timeIds })
      : { data: [] as RosterHeadcountBatchRow[], error: null };
  const headcountByTime = new Map<number, number>();
  if (!rosterBatchErr && Array.isArray(rosterBatchRows)) {
    for (const row of rosterBatchRows as RosterHeadcountBatchRow[]) {
      const tid = Number(row.time_id);
      const head = Number(row.headcount);
      if (Number.isFinite(tid) && tid > 0) headcountByTime.set(tid, Number.isFinite(head) ? Math.max(0, head) : 0);
    }
  }
  const rosterEntries = await Promise.all(
    lista.map(async (t) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      let rosterCount = headcountByTime.get(t.id) ?? null;
      if (rosterCount == null) {
        const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: t.id });
        rosterCount = !headErr && headRaw != null && Number.isFinite(Number(headRaw)) ? Math.max(0, Number(headRaw)) : 1;
      }
      return [t.id, Math.max(0, cap - rosterCount)] as const;
    }),
  );
  const vagasDisponiveisMap = new Map<number, number>(rosterEntries);
  const listaComVagas = lista.filter((t) => (vagasDisponiveisMap.get(t.id) ?? 0) > 0);
  const pendentePorTime = new Map((minhasCandidaturas ?? []).map((c) => [c.time_id as number, c.id as number]));
  const timesSouMembro = new Set((meusMembros ?? []).map((m) => Number(m.time_id)));

  const meuTimeIds = new Set<number>();
  for (const row of minhasCriadorTimes) {
    const id = Number(row.id);
    if (Number.isFinite(id) && id > 0) meuTimeIds.add(id);
  }
  for (const row of meusMembros ?? []) {
    const id = Number((row as { time_id?: number }).time_id);
    if (Number.isFinite(id) && id > 0) meuTimeIds.add(id);
  }
  const listaRecrutamentoPublico = listaComVagas.filter((t) => !meuTimeIds.has(Number(t.id)));

  const vagasListItems = listaRecrutamentoPublico.map((t) => ({
    team: { ...rowToCardData(t), vagas_disponiveis: vagasDisponiveisMap.get(t.id) ?? null },
    minhaCandidaturaPendenteId: pendentePorTime.get(t.id) ?? null,
    jaSouMembro: timesSouMembro.has(t.id),
  }));

  return (
    <div id="vagas-recrutamento" className="scroll-mt-24">
      <TimesRecrutamentoVagasList
        key={`${q.trim()}:${vagasListItems.map((i) => i.team.id).join(",")}`}
        viewerUserId={userId}
        items={vagasListItems}
      />
    </div>
  );
}
