import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { distanciaKm } from "@/lib/geo/distance-km";
import { fetchDashboardRankingCooldownBlocklists } from "@/lib/match/dashboard-ranking-cooldown-blocklists";
import { type AtletaRow, firstProfile } from "./dashboard-helpers";

export type DashboardRadarTeamsArgs = {
  supabase: SupabaseClient;
  userId: string;
  q: string;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
  activeOpponentIds: Set<string>;
  meusEsportesSet: Set<number>;
  esportePrincipalId: number | null;
  esporteCardNome: string;
  dashTeamIds: number[];
  dashTeamIdSet: Set<number>;
  myTeamsInClause: string;
  matchHref: string;
};

export type TimeRadarRow = {
  id?: number | null;
  nome?: string | null;
  tipo?: string | null;
  localizacao?: string | null;
  escudo?: string | null;
  esporte_id?: number | null;
  vagas_abertas?: boolean | null;
  aceita_pedidos?: boolean | null;
  lat?: number | string | null;
  lng?: number | string | null;
  criador_id?: string | null;
  pontos_ranking?: number | null;
  eid_time?: number | null;
  esportes?: unknown;
};

export type DashboardRadarSpotlightPayload = {
  atletaMaisProximo: { row: AtletaRow; p: ReturnType<typeof firstProfile>; dist: number } | null;
  duplaMaisProxima: { t: TimeRadarRow; dist: number } | null;
  timeMaisProximo: { t: TimeRadarRow; dist: number } | null;
  esporteCardNome: string;
  matchHref: string;
  q: string;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
  timesComBusca: Array<{ t: TimeRadarRow; dist: number }>;
};

export type DashboardRadarVagasPayload = DashboardRadarSpotlightPayload & {
  timesFiltrados: Array<{ t: TimeRadarRow; dist: number }>;
  teamRosterMap: Map<number, number>;
  vagasDisponiveisMap: Map<number, number>;
};

/** Contagem de integrantes (mesma lógica da seção de vagas no dashboard). */
async function fetchTimeRosterHeadcountsMap(supabase: SupabaseClient, teamRosterIds: number[]): Promise<Map<number, number>> {
  const teamRosterMap = new Map<number, number>();
  const ids = [...new Set(teamRosterIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) return teamRosterMap;

  const { data: headBatch, error: headBatchErr } = await supabase.rpc("time_roster_headcount_many", {
    p_time_ids: ids,
  });
  if (!headBatchErr && Array.isArray(headBatch)) {
    for (const row of headBatch as Array<{ time_id?: number | null; headcount?: number | null }>) {
      const timeId = Number(row.time_id ?? 0);
      const hc = Number(row.headcount ?? 0);
      if (Number.isFinite(timeId) && timeId > 0) {
        teamRosterMap.set(timeId, Number.isFinite(hc) ? Math.max(0, hc) : 0);
      }
    }
  } else {
    const { data: rosterRows } = await supabase
      .from("membros_time")
      .select("time_id")
      .in("time_id", ids)
      .in("status", ["ativo", "aceito", "aprovado"]);
    for (const row of rosterRows ?? []) {
      const timeId = Number((row as { time_id?: number | null }).time_id ?? 0);
      if (!Number.isFinite(timeId) || timeId <= 0) continue;
      teamRosterMap.set(timeId, (teamRosterMap.get(timeId) ?? 0) + 1);
    }
  }
  for (const timeId of ids) {
    if (!teamRosterMap.has(timeId)) teamRosterMap.set(timeId, 0);
  }
  return teamRosterMap;
}

/** Formação ainda com vaga / carência: não deve aparecer em “Confrontos próximos”. */
function formacaoTemCarenciaOuRecrutando(t: TimeRadarRow, rosterMap: Map<number, number>): boolean {
  const id = Number(t.id ?? 0);
  if (!Number.isFinite(id) || id < 1) return true;
  const tipo = String(t.tipo ?? "").trim().toLowerCase();
  const cap = tipo === "dupla" ? 2 : 18;
  const head = rosterMap.get(id) ?? 1;
  const vagasDisponiveis = Math.max(0, cap - head);
  if (vagasDisponiveis > 0) return true;
  if (Boolean(t.vagas_abertas)) return true;
  return false;
}

async function loadDashboardRadarSpotlightUncached(args: DashboardRadarTeamsArgs): Promise<DashboardRadarSpotlightPayload> {
  const {
    supabase,
    userId,
    q,
    hasMyCoords,
    myLat,
    myLng,
    activeOpponentIds,
    meusEsportesSet,
    esportePrincipalId,
    esporteCardNome,
    dashTeamIds,
    dashTeamIdSet,
    myTeamsInClause,
    matchHref,
  } = args;

  let atletasQuery = supabase
    .from("usuario_eid")
    .select(
      "nota_eid, usuario_id, profiles!inner(id, nome, avatar_url, localizacao, lat, lng, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada)",
    )
    .neq("usuario_id", userId)
    .order("nota_eid", { ascending: false })
    .limit(80);
  if (esportePrincipalId != null) {
    atletasQuery = atletasQuery.eq("esporte_id", esportePrincipalId);
  }

  const esportesParaFiltro = Array.from(meusEsportesSet);
  let timesQuery = supabase
    .from("times")
    .select("id, nome, tipo, localizacao, escudo, esporte_id, vagas_abertas, aceita_pedidos, lat, lng, criador_id, pontos_ranking, eid_time, esportes(nome)")
    .neq("criador_id", userId)
    .order("pontos_ranking", { ascending: false })
    .limit(50);
  if (esportesParaFiltro.length) {
    timesQuery = timesQuery.in("esporte_id", esportesParaFiltro);
  }

  const [
    { data: atletasRaw },
    { data: timesRaw },
    { data: minhasFormacoesMembro },
    { data: pendingColetivoRows },
    { blockedUserIds: rankingCooldownUserIds, blockedTeamIds: rankingCooldownTeamIds },
  ] = await Promise.all([
    atletasQuery,
    timesQuery,
    supabase.from("membros_time").select("time_id").eq("usuario_id", userId).in("status", ["ativo", "aceito", "aprovado"]),
    dashTeamIds.length > 0
      ? supabase
          .from("matches")
          .select("desafiante_time_id, adversario_time_id")
          .eq("status", "Pendente")
          .eq("finalidade", "ranking")
          .in("modalidade_confronto", ["dupla", "time"])
          .or(`desafiante_time_id.in.(${myTeamsInClause}),adversario_time_id.in.(${myTeamsInClause})`)
      : Promise.resolve({ data: [] as Array<{ desafiante_time_id?: number | null; adversario_time_id?: number | null }> }),
    fetchDashboardRankingCooldownBlocklists(supabase, {
      viewerId: userId,
      esporteId: esportePrincipalId,
      viewerTeamIds: dashTeamIds,
    }),
  ]);

  const atletasRows = (atletasRaw ?? []) as AtletaRow[];
  const atletasRowsFiltered = atletasRows.filter((row) => {
    const p = firstProfile(row.profiles);
    const id = String(p?.id ?? row.usuario_id ?? "");
    const maioridadeOk = p?.match_maioridade_confirmada === true;
    return id
      ? !activeOpponentIds.has(id) && !rankingCooldownUserIds.has(id) && maioridadeOk
      : false;
  });
  let atletasComDist: Array<{ row: AtletaRow; p: ReturnType<typeof firstProfile>; dist: number }> = atletasRowsFiltered.map(
    (row) => {
      const p = firstProfile(row.profiles);
      const lat = Number(p?.lat ?? NaN);
      const lng = Number(p?.lng ?? NaN);
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
      return { row, p, dist };
    },
  );
  atletasComDist.sort((a, b) => {
    if (hasMyCoords) return a.dist - b.dist;
    return Number(b.row.nota_eid ?? 0) - Number(a.row.nota_eid ?? 0);
  });
  const seenAtleta = new Set<string>();
  atletasComDist = atletasComDist.filter(({ p }) => {
    const id = String(p?.id ?? "");
    if (!id) return false;
    if (seenAtleta.has(id)) return false;
    seenAtleta.add(id);
    return true;
  });
  const atletasFiltrados = atletasComDist
    .filter(({ p }) => {
      if (!q) return true;
      const nome = String(p?.nome ?? "").toLowerCase();
      const loc = String(p?.localizacao ?? "").toLowerCase();
      return nome.includes(q) || loc.includes(q);
    })
    .slice(0, 12);

  const timeIdsComDesafioRankingPendente = new Set<number>();
  for (const m of pendingColetivoRows ?? []) {
    const a = Number((m as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const b = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) continue;
    if (dashTeamIdSet.has(a)) timeIdsComDesafioRankingPendente.add(b);
    if (dashTeamIdSet.has(b)) timeIdsComDesafioRankingPendente.add(a);
  }
  const meusTimesMembroIds = new Set(
    (minhasFormacoesMembro ?? [])
      .map((row) => Number((row as { time_id?: number | null }).time_id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const timeCriadorIds = [...new Set((timesRaw ?? []).map((t) => String(t.criador_id ?? "")).filter(Boolean))];
  const { data: timeCriadoresProfiles } =
    timeCriadorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, match_maioridade_confirmada")
          .in("id", timeCriadorIds)
      : { data: [] as Array<{ id: string; match_maioridade_confirmada: boolean | null }> };
  const criadoresComMaioridade = new Set(
    (timeCriadoresProfiles ?? [])
      .filter((p) => p.match_maioridade_confirmada === true)
      .map((p) => String(p.id)),
  );
  const timeNoRankingCooldown = (t: TimeRadarRow) => {
    const tid = Number(t.id ?? 0);
    const eid = Number(t.esporte_id ?? 0);
    if (
      esportePrincipalId != null &&
      Number.isFinite(esportePrincipalId) &&
      esportePrincipalId > 0 &&
      Number.isFinite(eid) &&
      eid === esportePrincipalId &&
      rankingCooldownTeamIds.has(tid)
    ) {
      return false;
    }
    return true;
  };
  const timesSemAtivos = (timesRaw ?? []).filter(
    (t) =>
      !meusTimesMembroIds.has(Number(t.id ?? 0)) &&
      !activeOpponentIds.has(String(t.criador_id ?? "")) &&
      criadoresComMaioridade.has(String(t.criador_id ?? "")) &&
      !timeIdsComDesafioRankingPendente.has(Number(t.id ?? 0)) &&
      timeNoRankingCooldown(t),
  );
  const timesComDist = timesSemAtivos.map((t) => {
    const lat = Number(t.lat ?? NaN);
    const lng = Number(t.lng ?? NaN);
    const dist = hasMyCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { t: t as TimeRadarRow, dist };
  });
  timesComDist.sort((a, b) => a.dist - b.dist);
  const timesComBusca = timesComDist
    .filter(({ t }) => {
      if (!q) return true;
      return String(t.nome ?? "").toLowerCase().includes(q) || String(t.localizacao ?? "").toLowerCase().includes(q);
    })
    .filter(({ t }) => meusEsportesSet.size === 0 || meusEsportesSet.has(Number(t.esporte_id ?? 0)));

  const spotlightTeamIds = [
    ...new Set(timesComBusca.map(({ t }) => Number(t.id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const spotlightRosterMap = await fetchTimeRosterHeadcountsMap(supabase, spotlightTeamIds);
  const timesComBuscaSemCarencia = timesComBusca.filter(
    ({ t }) => !formacaoTemCarenciaOuRecrutando(t, spotlightRosterMap),
  );

  const atletaMaisProximo = atletasFiltrados[0] ?? null;
  const duplaMaisProxima =
    timesComBuscaSemCarencia.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "dupla") ?? null;
  const timeMaisProximo =
    timesComBuscaSemCarencia.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "time") ?? null;

  return {
    atletaMaisProximo,
    duplaMaisProxima,
    timeMaisProximo,
    esporteCardNome,
    matchHref,
    q,
    hasMyCoords,
    myLat,
    myLng,
    timesComBusca,
  };
}

export const getDashboardRadarSpotlightPayload = cache(async (args: DashboardRadarTeamsArgs) =>
  loadDashboardRadarSpotlightUncached(args)
);

async function loadDashboardRadarVagasUncached(args: DashboardRadarTeamsArgs): Promise<DashboardRadarVagasPayload> {
  const spot = await getDashboardRadarSpotlightPayload(args);
  const { supabase } = args;
  const { timesComBusca } = spot;

  const teamRosterIds = [
    ...new Set([...timesComBusca.map(({ t }) => Number(t.id ?? 0))].filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const teamRosterMap = await fetchTimeRosterHeadcountsMap(supabase, teamRosterIds);
  const vagasDisponiveisMap = new Map<number, number>(
    timesComBusca.map(({ t }) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      const head = teamRosterMap.get(Number(t.id ?? 0)) ?? 1;
      return [Number(t.id), Math.max(0, cap - head)] as const;
    }),
  );
  const timesComBuscaEVaga = timesComBusca.filter(
    ({ t }) =>
      Boolean(t.vagas_abertas) &&
      Boolean(t.aceita_pedidos) &&
      (vagasDisponiveisMap.get(Number(t.id ?? 0)) ?? 0) > 0,
  );
  const timesFiltrados = timesComBuscaEVaga.slice(0, 12);

  return {
    ...spot,
    timesFiltrados,
    teamRosterMap,
    vagasDisponiveisMap,
  };
}

export const getDashboardRadarVagasPayload = cache(async (args: DashboardRadarTeamsArgs) =>
  loadDashboardRadarVagasUncached(args)
);
