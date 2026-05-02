import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCriadoresPorTimeIds } from "@/lib/agenda/desafio-match-leadership";

export type EspNome = { nome?: string | null };
/** Linha retornada pelas queries de partidas da agenda / painel (cards). */
export type AgendaPartidaCardRow = {
  id: number;
  esporte_id?: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  time1_id?: number | null;
  time2_id?: number | null;
  modalidade?: string | null;
  data_registro: string | null;
  data_partida: string | null;
  local_str: string | null;
  local_espaco_id: number | null;
  lancado_por?: string | null;
  status?: string | null;
  status_ranking?: string | null;
  agendamento_proposto_por?: string | null;
  agendamento_aceite_deadline?: string | null;
  esportes?: EspNome | EspNome[] | null;
};

export function firstOfRelation<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function getAgendaTeamContext(supabase: SupabaseClient, userId: string) {
  const [{ data: ownedTeams }, { data: memberTeams }] = await Promise.all([
    supabase.from("times").select("id").eq("criador_id", userId),
    supabase
      .from("membros_time")
      .select("time_id")
      .eq("usuario_id", userId)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const teamIds = [
    ...new Set(
      [...(ownedTeams ?? []).map((t) => Number(t.id)), ...(memberTeams ?? []).map((m) => Number(m.time_id))].filter(
        (v) => Number.isFinite(v) && v > 0
      )
    ),
  ];
  const teamClause = teamIds.length ? `,time1_id.in.(${teamIds.join(",")}),time2_id.in.(${teamIds.join(",")})` : "";
  return { teamIds, teamClause };
}

/** Times em que o usuário é líder ou membro ativo (para aceite de agendamento em dupla/time). */
export async function loadUserTimeIdsOnTeams(supabase: SupabaseClient, userId: string, candidateTimeIds: number[]) {
  const ids = [...new Set(candidateTimeIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return new Set<number>();
  const [{ data: owned }, { data: mems }] = await Promise.all([
    supabase.from("times").select("id").in("id", ids).eq("criador_id", userId),
    supabase
      .from("membros_time")
      .select("time_id")
      .eq("usuario_id", userId)
      .in("time_id", ids)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const out = new Set<number>();
  for (const r of owned ?? []) {
    if (r.id != null) out.add(Number(r.id));
  }
  for (const m of mems ?? []) {
    if (m.time_id != null) out.add(Number(m.time_id));
  }
  return out;
}

function modalidadeColetiva(modalidade: string | null | undefined, time1: number | null | undefined, time2: number | null | undefined) {
  const m = String(modalidade ?? "")
    .trim()
    .toLowerCase();
  return m === "dupla" || m === "time" || Boolean(time1 || time2);
}

/**
 * Quem pode aceitar/recusar proposta de agendamento: no individual, qualquer um dos dois jogadores
 * (exceto quem propôs). Em dupla/time, só o líder atual (`times.criador_id`) do lado que não propôs.
 */
export function computeAgendaPodeResponderProposta(
  p: Pick<
    AgendaPartidaCardRow,
    "status" | "jogador1_id" | "jogador2_id" | "time1_id" | "time2_id" | "modalidade" | "agendamento_proposto_por"
  >,
  userId: string,
  criadorPorTimeId: Map<number, string>
): boolean {
  if (String(p.status ?? "").trim().toLowerCase() !== "aguardando_aceite_agendamento") return false;
  const proposer = String(p.agendamento_proposto_por ?? "").trim();
  if (!proposer || proposer === userId) return false;

  const t1 = p.time1_id != null && Number(p.time1_id) > 0 ? Number(p.time1_id) : null;
  const t2 = p.time2_id != null && Number(p.time2_id) > 0 ? Number(p.time2_id) : null;
  if (!modalidadeColetiva(p.modalidade, t1, t2)) {
    return userId === p.jogador1_id || userId === p.jogador2_id;
  }
  if (!t1 && !t2) {
    return userId === p.jogador1_id || userId === p.jogador2_id;
  }

  const c1 = t1 ? criadorPorTimeId.get(t1) ?? "" : "";
  const c2 = t2 ? criadorPorTimeId.get(t2) ?? "" : "";

  if (proposer === c1 && c2) return userId === c2;
  if (proposer === c2 && c1) return userId === c1;
  if (proposer === String(p.jogador1_id ?? "").trim() && c2) return userId === c2;
  if (proposer === String(p.jogador2_id ?? "").trim() && c1) return userId === c1;
  return false;
}

/** Validação server-side do aceite de agendamento (espelha `computeAgendaPodeResponderProposta`). */
export async function userMayRespondPropostaAgendamento(
  supabase: SupabaseClient,
  p: {
    status: string | null;
    jogador1_id: string | null;
    jogador2_id: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
    modalidade?: string | null;
    agendamento_proposto_por: string | null;
  },
  userId: string
): Promise<boolean> {
  const criadorPorTimeId = await fetchCriadoresPorTimeIds(supabase, [Number(p.time1_id), Number(p.time2_id)]);
  return computeAgendaPodeResponderProposta(
    {
      status: p.status,
      jogador1_id: p.jogador1_id,
      jogador2_id: p.jogador2_id,
      time1_id: p.time1_id,
      time2_id: p.time2_id,
      modalidade: p.modalidade,
      agendamento_proposto_por: p.agendamento_proposto_por,
    },
    userId,
    criadorPorTimeId
  );
}

/**
 * Líder do lado adversário para notificação (dupla/time), quando o ator não bate com jogador1/2.
 */
export async function resolveOponenteLeaderUserIdForNotificacao(
  supabase: SupabaseClient,
  p: {
    jogador1_id: string | null;
    jogador2_id: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
  },
  atorUserId: string
): Promise<string | null> {
  if (p.jogador1_id === atorUserId) return p.jogador2_id;
  if (p.jogador2_id === atorUserId) return p.jogador1_id;
  const teamIds = [p.time1_id, p.time2_id]
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!teamIds.length) return null;
  const { data: rows } = await supabase.from("times").select("criador_id").in("id", teamIds);
  const creators = [...new Set((rows ?? []).map((r) => String(r.criador_id ?? "").trim()).filter(Boolean))];
  return creators.find((id) => id !== atorUserId) ?? null;
}

const partidasSelect =
  "id, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, modalidade, data_registro, data_partida, local_str, local_espaco_id, status, status_ranking, lancado_por, agendamento_proposto_por, agendamento_aceite_deadline, esportes(nome)";

export function fetchPartidasAgendadasUsuario(
  supabase: SupabaseClient,
  userId: string,
  teamClause: string
) {
  return supabase
    .from("partidas")
    .select(partidasSelect)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .in("status", ["agendada", "aguardando_aceite_agendamento"])
    .order("data_partida", { ascending: true, nullsFirst: false })
    .order("data_registro", { ascending: true })
    .order("id", { ascending: true })
    .limit(40);
}

export function fetchPlacarAguardandoConfirmacao(
  supabase: SupabaseClient,
  userId: string,
  teamClause: string
) {
  return supabase
    .from("partidas")
    .select(partidasSelect)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", userId)
    .order("data_resultado", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);
}
