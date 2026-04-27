import type { SupabaseClient } from "@supabase/supabase-js";

export type EspNome = { nome?: string | null };
/** Linha retornada pelas queries de partidas da agenda / painel (cards). */
export type AgendaPartidaCardRow = {
  id: number;
  esporte_id?: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  data_registro: string | null;
  data_partida: string | null;
  local_str: string | null;
  local_espaco_id: number | null;
  lancado_por?: string | null;
  status?: string | null;
  status_ranking?: string | null;
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

const partidasSelect =
  "id, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, modalidade, data_registro, data_partida, local_str, local_espaco_id, status, status_ranking, lancado_por, esportes(nome)";

export function fetchPartidasAgendadasUsuario(
  supabase: SupabaseClient,
  userId: string,
  teamClause: string
) {
  return supabase
    .from("partidas")
    .select(partidasSelect)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .eq("status", "agendada")
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
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}${teamClause}`)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", userId)
    .order("data_resultado", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);
}
