import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { distanciaKm } from "@/lib/geo/distance-km";
import { fetchDashboardRankingCooldownBlocklists } from "@/lib/match/dashboard-ranking-cooldown-blocklists";
import { fetchMatchRadarCardsTodasMerged, type MatchRadarCard } from "@/lib/match/radar-snapshot";
import { type AtletaRow, type ProfileMini } from "./dashboard-helpers";

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
  atletaMaisProximo: { row: AtletaRow; p: ProfileMini | null; dist: number } | null;
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

/** Mesma origem que `/match?tipo=todas` (`includeActiveOpponents: true` + RPCs + filtro de carência). */
function individualCardToAtletaSpotlight(c: MatchRadarCard): {
  row: AtletaRow;
  p: ProfileMini | null;
  dist: number;
} {
  const p: ProfileMini = {
    id: c.id,
    nome: c.nome,
    avatar_url: c.avatarUrl,
    localizacao: c.localizacao,
    disponivel_amistoso: c.disponivelAmistoso,
    match_maioridade_confirmada: true,
  };
  return {
    row: { nota_eid: c.eid, usuario_id: c.id, profiles: p },
    p,
    dist: c.dist,
  };
}

function formationCardToTimeSpotlight(c: MatchRadarCard): { t: TimeRadarRow; dist: number } {
  const tid = Number(c.id);
  return {
    t: {
      id: Number.isFinite(tid) ? tid : null,
      nome: c.nome,
      tipo: c.modalidade === "dupla" ? "dupla" : "time",
      localizacao: c.localizacao,
      escudo: c.avatarUrl,
      esporte_id: c.esporteId,
      pontos_ranking: c.rank,
      eid_time: c.eid,
    },
    dist: c.dist,
  };
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

  const esportesParaFiltro = Array.from(meusEsportesSet);
  const eidsParaCarência =
    meusEsportesSet.size > 0
      ? [...meusEsportesSet].filter((n) => Number.isFinite(n) && n > 0)
      : esportePrincipalId != null && Number.isFinite(Number(esportePrincipalId)) && Number(esportePrincipalId) > 0
        ? [Number(esportePrincipalId)]
        : [];

  let timesQuery = supabase
    .from("times")
    .select("id, nome, tipo, localizacao, escudo, esporte_id, vagas_abertas, aceita_pedidos, lat, lng, criador_id, pontos_ranking, eid_time, esportes(nome)")
    .neq("criador_id", userId)
    .order("pontos_ranking", { ascending: false })
    .limit(50);
  if (esportesParaFiltro.length) {
    timesQuery = timesQuery.in("esporte_id", esportesParaFiltro);
  }

  const [timesRes, membrosRes, pendingRes, ...cooldownResList] = await Promise.all([
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
    ...eidsParaCarência.map((eid) =>
      fetchDashboardRankingCooldownBlocklists(supabase, {
        viewerId: userId,
        esporteId: eid,
        viewerTeamIds: dashTeamIds,
      })
    ),
  ]);

  const { data: timesRaw } = timesRes;
  const { data: minhasFormacoesMembro } = membrosRes;
  const { data: pendingColetivoRows } = pendingRes;

  const rankingCooldownTeamIds = new Set<number>();
  for (const bl of cooldownResList as Array<{ blockedTeamIds: Set<number> }>) {
    for (const tid of bl.blockedTeamIds) rankingCooldownTeamIds.add(tid);
  }

  /** Mesmo espírito do `/match?tipo=todas`: mesclar todos os esportes do perfil (`usuario_eid`), não só o “principal”. */
  const esporteIdsRadar =
    meusEsportesSet.size > 0
      ? [...meusEsportesSet].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b).map(String)
      : esportePrincipalId != null && Number(esportePrincipalId) > 0
        ? [String(esportePrincipalId)]
        : [];

  let atletaMaisProximo: { row: AtletaRow; p: ProfileMini | null; dist: number } | null = null;
  let duplaMaisProxima: { t: TimeRadarRow; dist: number } | null = null;
  let timeMaisProximo: { t: TimeRadarRow; dist: number } | null = null;

  if (esporteIdsRadar.length > 0) {
    const latR = Number.isFinite(myLat) ? myLat : 0;
    const lngR = Number.isFinite(myLng) ? myLng : 0;
    const merged = await fetchMatchRadarCardsTodasMerged(supabase, {
      viewerId: userId,
      sortBy: "match_ranking_points",
      raio: 30,
      esporteIds: esporteIdsRadar,
      lat: latR,
      lng: lngR,
      finalidade: "ranking",
      viewerTeamIds: dashTeamIds,
    });
    let pool = [...merged].sort((a, b) => a.dist - b.dist);
    if (meusEsportesSet.size > 0) {
      pool = pool.filter((c) => meusEsportesSet.has(Number(c.esporteId ?? 0)));
    }
    if (q) {
      const ql = q.toLowerCase();
      pool = pool.filter(
        (c) => String(c.nome ?? "").toLowerCase().includes(ql) || String(c.localizacao ?? "").toLowerCase().includes(ql),
      );
    }
    const seen = new Set<string>();
    pool = pool.filter((c) => {
      const key = `${c.modalidade}:${c.id}:${c.esporteId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const cardInd = pool.find((c) => c.modalidade === "individual");
    const cardDupla = pool.find((c) => c.modalidade === "dupla");
    const cardTime = pool.find((c) => c.modalidade === "time");
    if (cardInd) {
      const s = individualCardToAtletaSpotlight(cardInd);
      atletaMaisProximo = s.p ? { row: s.row, p: s.p, dist: s.dist } : null;
    }
    if (cardDupla) duplaMaisProxima = formationCardToTimeSpotlight(cardDupla);
    if (cardTime) timeMaisProximo = formationCardToTimeSpotlight(cardTime);
  }

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
    if (Number.isFinite(tid) && tid > 0 && rankingCooldownTeamIds.has(tid)) return false;
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
