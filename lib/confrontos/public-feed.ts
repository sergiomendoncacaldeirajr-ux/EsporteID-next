import type { SupabaseClient } from "@supabase/supabase-js";
import { distanciaKm } from "@/lib/geo/distance-km";

export type ConfrontoTipo = "individual" | "dupla" | "time";
export type ConfrontoStatusView = "proximos" | "encerrados";

export type ConfrontoSide = {
  id: string;
  name: string;
  avatarUrl: string | null;
  href: string;
  eidHref: string;
  eid: number | null;
  winner?: boolean;
};

export type PublicConfronto = {
  id: number;
  tipo: ConfrontoTipo;
  statusView: ConfrontoStatusView;
  esporteId: number | null;
  esporteNome: string;
  dataHora: string | null;
  dataHoraIso: string | null;
  local: string | null;
  localHref: string | null;
  localLogoUrl: string | null;
  distanciaKm: number | null;
  placar: string | null;
  mensagem: string | null;
  origem: "Ranking" | "Torneio";
  ladoA: ConfrontoSide;
  ladoB: ConfrontoSide;
};

type PartidaRow = {
  id: number;
  esporte_id: number | null;
  modalidade: string | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  time1_id: number | null;
  time2_id: number | null;
  vencedor_id: string | number | null;
  placar_1: number | null;
  placar_2: number | null;
  status: string | null;
  torneio_id: number | null;
  data_partida: string | null;
  data_resultado: string | null;
  data_registro: string | null;
  local_str: string | null;
  local_espaco_id: number | null;
  mensagem: string | null;
  esportes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

type ProfileRow = { id: string; nome: string | null; avatar_url: string | null };
type TeamRow = { id: number; nome: string | null; escudo: string | null; eid_time: number | null; tipo: string | null };
type LocalRow = {
  id: number;
  nome_publico: string | null;
  localizacao: string | null;
  logo_arquivo: string | null;
  lat: number | null;
  lng: number | null;
};

const PAGE_SIZE = 10;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function normalizeConfrontoTipo(value: string | string[] | undefined): ConfrontoTipo {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "dupla" || raw === "time" ? raw : "individual";
}

export function normalizeConfrontoStatusView(value: string | string[] | undefined): ConfrontoStatusView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "encerrados" ? "encerrados" : "proximos";
}

export function confrontoPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return Math.max(1, Number(raw ?? 1) || 1);
}

export function modalidadeMatchesTipo(row: Pick<PartidaRow, "modalidade" | "time1_id" | "time2_id">, tipo: ConfrontoTipo) {
  const modal = String(row.modalidade ?? "").trim().toLowerCase();
  if (tipo === "individual") return modal === "individual" || (!row.time1_id && !row.time2_id && modal !== "dupla" && modal !== "time");
  if (tipo === "dupla") return modal === "dupla";
  return modal === "time";
}

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function safeInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "E";
}

function localLookupName(value: string | null | undefined) {
  return String(value ?? "").split(" — ")[0].trim();
}

function localLookupLocation(value: string | null | undefined) {
  const str = String(value ?? "").trim();
  return str.includes(" — ") ? str.slice(str.indexOf(" — ") + 3).trim() : null;
}

function normalizeLocalLookup(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function sideFromProfile(profile: ProfileRow | undefined, id: string | null, esporteId: number | null, eid: number | null, winner: boolean): ConfrontoSide {
  const realId = id ?? "";
  const name = profile?.nome?.trim() || "Atleta";
  return {
    id: realId,
    name,
    avatarUrl: profile?.avatar_url ?? null,
    href: `/perfil/${encodeURIComponent(realId)}`,
    eidHref: esporteId ? `/perfil/${encodeURIComponent(realId)}/eid/${Number(esporteId)}` : `/perfil/${encodeURIComponent(realId)}`,
    eid,
    winner,
  };
}

function sideFromTeam(team: TeamRow | undefined, id: number | null, esporteId: number | null, winner: boolean): ConfrontoSide {
  const realId = Number(id ?? 0);
  const tipo = String(team?.tipo ?? "").trim().toLowerCase();
  const base = tipo === "dupla" ? "/perfil-dupla" : "/perfil-time";
  const name = team?.nome?.trim() || (tipo === "dupla" ? "Dupla" : "Time");
  return {
    id: String(realId),
    name,
    avatarUrl: team?.escudo ?? null,
    href: `${base}/${realId}`,
    eidHref: esporteId ? `${base}/${realId}/eid/${Number(esporteId)}` : `${base}/${realId}`,
    eid: typeof team?.eid_time === "number" ? Number(team.eid_time) : null,
    winner,
  };
}

export async function loadPublicConfrontos({
  supabase,
  viewerId,
  statusView,
  tipo,
  esporteId,
  page,
}: {
  supabase: SupabaseClient;
  viewerId: string;
  statusView: ConfrontoStatusView;
  tipo: ConfrontoTipo;
  esporteId: number | null;
  page: number;
}): Promise<{ items: PublicConfronto[]; hasMore: boolean; pageSize: number }> {
  let myLat = Number.NaN;
  let myLng = Number.NaN;
  const includeDetails = statusView === "encerrados";
  if (includeDetails) {
    const { data: me } = await supabase.from("profiles").select("lat, lng").eq("id", viewerId).maybeSingle();
    myLat = Number((me as { lat?: unknown } | null)?.lat ?? NaN);
    myLng = Number((me as { lng?: unknown } | null)?.lng ?? NaN);
  }
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);
  const nowIso = new Date().toISOString();
  const wanted = page * PAGE_SIZE + 24;
  let query =
    statusView === "proximos"
      ? supabase
          .from("partidas")
          .select("id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, status, torneio_id, data_partida, local_str, local_espaco_id, esportes(nome)")
      : supabase
          .from("partidas")
          .select("id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, vencedor_id, placar_1, placar_2, status, torneio_id, data_partida, data_resultado, data_registro, local_str, local_espaco_id, mensagem, esportes(nome)");

  if (esporteId) query = query.eq("esporte_id", esporteId);
  if (tipo === "dupla") {
    query = query.eq("modalidade", "dupla");
  } else if (tipo === "time") {
    query = query.eq("modalidade", "time");
  } else {
    query = query.or("modalidade.eq.individual,and(time1_id.is.null,time2_id.is.null)");
  }
  if (statusView === "proximos") {
    query = query
      .in("status", ["agendada"])
      .gte("data_partida", nowIso)
      .order("data_partida", { ascending: true, nullsFirst: false })
      .limit(wanted);
  } else {
    query = query
      .in("status", ["concluida", "concluída", "finalizada", "encerrada", "validada"])
      .order("data_resultado", { ascending: false, nullsFirst: false })
      .order("data_partida", { ascending: false, nullsFirst: false })
      .limit(wanted);
  }

  const { data } = await query;
  const rows = ((data ?? []) as PartidaRow[]).filter((row) => modalidadeMatchesTipo(row, tipo));
  const profileIds = [
    ...new Set(rows.flatMap((p) => [p.jogador1_id, p.jogador2_id]).filter((id): id is string => Boolean(id))),
  ];
  const teamIds = [
    ...new Set(rows.flatMap((p) => [p.time1_id, p.time2_id]).filter((id): id is number => typeof id === "number" && id > 0)),
  ];
  const localIds = [
    ...new Set(rows.map((p) => p.local_espaco_id).filter((id): id is number => typeof id === "number" && id > 0)),
  ];
  const localStrNames = [
    ...new Set(
      rows
        .filter((p) => p.local_str && !(p.local_espaco_id && Number(p.local_espaco_id) > 0))
        .map((p) => localLookupName(p.local_str))
        .filter((name) => name.length >= 2)
    ),
  ];
  const esporteIds = [
    ...new Set(rows.map((p) => p.esporte_id).filter((id): id is number => typeof id === "number" && id > 0)),
  ];

  const [{ data: profiles }, { data: teams }, { data: locais }, { data: localStrLocais }, { data: eidRows }] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id, nome, avatar_url").in("id", profileIds) : Promise.resolve({ data: [] }),
    teamIds.length ? supabase.from("times").select("id, nome, escudo, eid_time, tipo").in("id", teamIds) : Promise.resolve({ data: [] }),
    localIds.length
      ? supabase.from("espacos_genericos").select(includeDetails ? "id, nome_publico, localizacao, logo_arquivo, lat, lng" : "id, nome_publico, localizacao, logo_arquivo").in("id", localIds)
      : Promise.resolve({ data: [] }),
    localStrNames.length
      ? supabase
          .from("espacos_genericos")
          .select(includeDetails ? "id, nome_publico, localizacao, logo_arquivo, lat, lng" : "id, nome_publico, localizacao, logo_arquivo")
          .in("nome_publico", localStrNames)
      : Promise.resolve({ data: [] }),
    includeDetails && profileIds.length && esporteIds.length
      ? supabase.from("usuario_eid").select("usuario_id, esporte_id, nota_eid").in("usuario_id", profileIds).in("esporte_id", esporteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
  const teamMap = new Map((teams as TeamRow[] | null ?? []).map((t) => [Number(t.id), t]));
  const localMap = new Map((locais as LocalRow[] | null ?? []).map((l) => [Number(l.id), l]));
  const localStrMap = new Map<string, LocalRow>();
  const localStrRows = new Map<number, LocalRow>();
  for (const local of (locais as LocalRow[] | null) ?? []) localStrRows.set(Number(local.id), local);
  for (const local of (localStrLocais as LocalRow[] | null) ?? []) localStrRows.set(Number(local.id), local);
  const localStrCandidates = [...localStrRows.values()];
  for (const row of rows.filter((p) => p.local_str && !(p.local_espaco_id && Number(p.local_espaco_id) > 0))) {
    const str = String(row.local_str ?? "").trim();
    if (!str || localStrMap.has(str)) continue;
    const namePart = normalizeLocalLookup(localLookupName(str));
    const locPart = normalizeLocalLookup(localLookupLocation(str));
    const candidates = localStrCandidates.filter((local) => normalizeLocalLookup(local.nome_publico) === namePart);
    let match = candidates[0];
    if (candidates.length > 1 && locPart) {
      const precise = candidates.find((local) => normalizeLocalLookup(local.localizacao).includes(locPart));
      if (precise) match = precise;
    }
    if (match) localStrMap.set(str, match);
  }
  const eidMap = new Map(
    ((eidRows ?? []) as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }>).map((r) => [
      `${r.usuario_id}:${Number(r.esporte_id)}`,
      r.nota_eid == null ? null : Number(r.nota_eid),
    ])
  );

  const items = rows
    .map((row): PublicConfronto | null => {
      const esporteNome = firstRelation(row.esportes)?.nome?.trim() || "Esporte";
      const localStr = String(row.local_str ?? "").trim();
      const localRow = (row.local_espaco_id ? localMap.get(Number(row.local_espaco_id)) : undefined) ?? (localStr ? localStrMap.get(localStr) : undefined);
      const lat = Number(localRow?.lat ?? NaN);
      const lng = Number(localRow?.lng ?? NaN);
      const dist = hasCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : null;
      const winnerRaw = row.vencedor_id == null ? "" : String(row.vencedor_id);
      const placar = row.placar_1 != null && row.placar_2 != null ? `${Number(row.placar_1)} × ${Number(row.placar_2)}` : null;
      const local = String(row.local_str ?? "").trim() || localRow?.nome_publico?.trim() || localRow?.localizacao?.trim() || null;
      const sideA =
        tipo === "individual"
          ? sideFromProfile(
              row.jogador1_id ? profileMap.get(row.jogador1_id) : undefined,
              row.jogador1_id,
              row.esporte_id,
              row.jogador1_id && row.esporte_id ? eidMap.get(`${row.jogador1_id}:${Number(row.esporte_id)}`) ?? null : null,
              Boolean(row.jogador1_id && winnerRaw === row.jogador1_id)
            )
          : sideFromTeam(teamMap.get(Number(row.time1_id ?? 0)), row.time1_id, row.esporte_id, Boolean(row.time1_id && winnerRaw === String(row.time1_id)));
      const sideB =
        tipo === "individual"
          ? sideFromProfile(
              row.jogador2_id ? profileMap.get(row.jogador2_id) : undefined,
              row.jogador2_id,
              row.esporte_id,
              row.jogador2_id && row.esporte_id ? eidMap.get(`${row.jogador2_id}:${Number(row.esporte_id)}`) ?? null : null,
              Boolean(row.jogador2_id && winnerRaw === row.jogador2_id)
            )
          : sideFromTeam(teamMap.get(Number(row.time2_id ?? 0)), row.time2_id, row.esporte_id, Boolean(row.time2_id && winnerRaw === String(row.time2_id)));
      if (!sideA.id || !sideB.id) return null;
      return {
        id: Number(row.id),
        tipo,
        statusView,
        esporteId: row.esporte_id,
        esporteNome,
        dataHora: fmtDate(row.data_partida ?? row.data_resultado ?? row.data_registro),
        dataHoraIso: row.data_partida ?? row.data_resultado ?? row.data_registro ?? null,
        local,
        localHref: localRow?.id ? `/local/${Number(localRow.id)}` : null,
        localLogoUrl: localRow?.logo_arquivo?.trim() || null,
        distanciaKm: dist,
        placar,
        mensagem: row.mensagem ?? null,
        origem: row.torneio_id ? "Torneio" : "Ranking",
        ladoA: sideA,
        ladoB: sideB,
      };
    })
    .filter((item): item is PublicConfronto => Boolean(item))
    .sort((a, b) => {
      if (statusView === "proximos") {
        const ta = a.dataHoraIso ? new Date(a.dataHoraIso).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.dataHoraIso ? new Date(b.dataHoraIso).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
      } else {
        const ta = a.dataHoraIso ? new Date(a.dataHoraIso).getTime() : 0;
        const tb = b.dataHoraIso ? new Date(b.dataHoraIso).getTime() : 0;
        if (ta !== tb) return tb - ta;
      }
      const da = a.distanciaKm ?? 99999;
      const db = b.distanciaKm ?? 99999;
      return da - db;
    });

  const start = (page - 1) * PAGE_SIZE;
  const slice = items.slice(0, page * PAGE_SIZE);
  return { items: slice, hasMore: items.length > start + PAGE_SIZE, pageSize: PAGE_SIZE };
}

export function sideInitial(side: Pick<ConfrontoSide, "name">) {
  return safeInitial(side.name);
}
