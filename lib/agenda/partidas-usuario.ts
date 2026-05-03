import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCriadoresPorTimeIds } from "@/lib/agenda/desafio-match-leadership";

export type EspNome = { nome?: string | null };
/** Linha retornada pelas queries de partidas da agenda / painel (cards). */
export type AgendaPartidaCardRow = {
  id: number;
  /** Vínculo com `matches.id` (ranking); preferir para localizar cancelamento/reagendamento. */
  match_id?: number | null;
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

/**
 * Lado 1 = jogador1 + time1 (criador + membros ativos). Lado 2 = jogador2 + time2.
 * Usado para notificar todo o elenco quando data/local do desafio é proposto ou confirmado.
 */
export async function loadPartidaLadosUsuarioIds(
  supabase: SupabaseClient,
  p: {
    jogador1_id: string | null;
    jogador2_id: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
  }
): Promise<{ lado1: Set<string>; lado2: Set<string> }> {
  const lado1 = new Set<string>();
  const lado2 = new Set<string>();
  const j1 = String(p.jogador1_id ?? "").trim();
  const j2 = String(p.jogador2_id ?? "").trim();
  if (j1) lado1.add(j1);
  if (j2) lado2.add(j2);
  const t1 = Number(p.time1_id ?? 0);
  const t2 = Number(p.time2_id ?? 0);
  const teamIds = [t1, t2].filter((n) => Number.isFinite(n) && n > 0);
  if (!teamIds.length) return { lado1, lado2 };

  const [{ data: mems }, { data: times }] = await Promise.all([
    supabase
      .from("membros_time")
      .select("time_id, usuario_id")
      .in("time_id", teamIds)
      .in("status", ["ativo", "aceito", "aprovado"]),
    supabase.from("times").select("id, criador_id").in("id", teamIds),
  ]);

  for (const row of times ?? []) {
    const tid = Number((row as { id?: number }).id ?? 0);
    const c = String((row as { criador_id?: string | null }).criador_id ?? "").trim();
    if (!c || !Number.isFinite(tid) || tid <= 0) continue;
    if (tid === t1) lado1.add(c);
    else if (tid === t2) lado2.add(c);
  }
  for (const m of mems ?? []) {
    const tid = Number((m as { time_id?: number }).time_id ?? 0);
    const u = String((m as { usuario_id?: string | null }).usuario_id ?? "").trim();
    if (!u || !Number.isFinite(tid) || tid <= 0) continue;
    if (tid === t1) lado1.add(u);
    else if (tid === t2) lado2.add(u);
  }
  return { lado1, lado2 };
}

/** Em qual lado da partida está o usuário (1 = jogador1/time1, 2 = jogador2/time2). */
export function usuarioEmQualLadoPartida(userId: string, lado1: Set<string>, lado2: Set<string>): 1 | 2 | null {
  if (lado1.has(userId)) return 1;
  if (lado2.has(userId)) return 2;
  return null;
}

const partidasSelect =
  "id, match_id, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, modalidade, data_registro, data_partida, local_str, local_espaco_id, status, status_ranking, lancado_por, agendamento_proposto_por, agendamento_aceite_deadline, esportes(nome)";

const partidasSelectComPlacarRevisao = `${partidasSelect},data_resultado,placar_1,placar_2`;

/** Oponente só deve ver fluxo “revisar” quando há resultado persistido (contestação zera tudo até o reenvio). */
export function partidaRowTemResultadoParaRevisaoOponente(p: {
  data_resultado?: string | null;
  placar_1?: number | null;
  placar_2?: number | null;
}): boolean {
  return p.data_resultado != null || p.placar_1 != null || p.placar_2 != null;
}

/**
 * Local na agenda para qualquer membro (líder ou elenco): texto do match (reagendamento), senão `local_str`, senão nome do espaço genérico.
 */
export function mergeAgendaLocalDisplayed(
  scheduledLocationFromMatch: string | null | undefined,
  partidaLocalStr: string | null | undefined,
  localEspacoId: number | null | undefined,
  nomeEspacoGenerico: string | null | undefined
): string | null {
  const fromMatch = String(scheduledLocationFromMatch ?? "").trim();
  if (fromMatch) return fromMatch;
  const fromStr = String(partidaLocalStr ?? "").trim();
  if (fromStr) return fromStr;
  const id = Number(localEspacoId ?? 0);
  if (Number.isFinite(id) && id > 0) {
    const nome = String(nomeEspacoGenerico ?? "").trim();
    return nome || null;
  }
  return null;
}

/** Resolve o `matches.id` usado no fluxo de cancelamento quando a chave por duelo (jogadores) diverge da linha do match. */
export function resolveCancelMatchIdParaCard(
  pr: Pick<AgendaPartidaCardRow, "match_id" | "jogador1_id" | "jogador2_id" | "esporte_id">,
  cancelMatchIdByMatchId: ReadonlyMap<number, number>,
  cancelMatchIdByDuelo: ReadonlyMap<string, number>,
  dueloKeyRaw: string | null
): number | null {
  const mid = Number(pr.match_id ?? 0);
  if (Number.isFinite(mid) && mid > 0) {
    const fromMatch = cancelMatchIdByMatchId.get(mid);
    if (fromMatch != null) return fromMatch;
  }
  if (dueloKeyRaw) {
    const fromDuelo = cancelMatchIdByDuelo.get(dueloKeyRaw);
    if (fromDuelo != null) return fromDuelo;
  }
  return null;
}

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

/**
 * Após contestar o placar do oponente, o status continua `aguardando_confirmacao` e quem contestou vira `lancado_por`.
 * Essas linhas não aparecem em `fetchPartidasAgendadasUsuario` (só `agendada`); o painel social precisa listá-las para reenvio.
 */
export function fetchPartidasRelancamentoAposContestacao(supabase: SupabaseClient, userId: string, teamClause: string) {
  return supabase
    .from("partidas")
    .select(partidasSelect)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .eq("status", "aguardando_confirmacao")
    .eq("lancado_por", userId)
    .eq("status_ranking", "resultado_contestado")
    .order("data_registro", { ascending: false })
    .order("id", { ascending: false })
    .limit(40);
}

export async function fetchPlacarAguardandoConfirmacao(
  supabase: SupabaseClient,
  userId: string,
  teamClause: string
) {
  const { data, error } = await supabase
    .from("partidas")
    .select(partidasSelectComPlacarRevisao)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", userId)
    .order("data_resultado", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(40);
  const filtradas = (data ?? []).filter((row) =>
    partidaRowTemResultadoParaRevisaoOponente(row as { data_resultado?: string | null; placar_1?: number | null; placar_2?: number | null })
  );
  return { data: filtradas.slice(0, 20) as AgendaPartidaCardRow[] | null, error };
}
