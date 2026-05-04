import type { SupabaseClient } from "@supabase/supabase-js";
import { MatchRadarApp } from "@/components/match/match-radar-app";
import { getEsportesConfrontoCached } from "@/lib/match/esportes-confronto";
import { isEsportePermitidoDesafioPerfilIndividual } from "@/lib/match/esporte-match-individual-policy";
import { filterMatchRadarCardsByRankingCooldown } from "@/lib/match/dashboard-ranking-cooldown-blocklists";
import {
  fetchMatchRadarCards,
  fetchMatchRadarCardsMultiSameTipo,
  fetchMatchRadarCardsTodasMerged,
} from "@/lib/match/radar-snapshot";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import {
  toGeneroFiltro,
  toMatchFinalidade,
  toRaio,
  toSortBy,
  toTipo,
  toViewMode,
  type MatchPageSearch,
  type RadarViewMode,
} from "./match-search-params";

export type MatchStreamRadarMe = {
  id: string;
  lat?: number | string | null;
  lng?: number | string | null;
  genero?: string | null;
  disponivel_amistoso?: boolean | null;
  disponivel_amistoso_ate?: string | null;
};

export type MatchStreamRadarProps = {
  supabase: SupabaseClient;
  viewerId: string;
  me: MatchStreamRadarMe;
  sp: MatchPageSearch;
  /** Hero em grade já montado na página (`/match`). */
  hideHero?: boolean;
};

export async function MatchStreamRadar({ supabase, viewerId, me, sp, hideHero = false }: MatchStreamRadarProps) {
  const tipo = toTipo(sp.tipo);
  const matchFinalidade = toMatchFinalidade(sp.finalidade);
  const initialView = toViewMode(sp.view);
  const sortBy = toSortBy(sp.sort_by);
  const raio = toRaio(sp.raio);
  const esporteParam = sp.esporte ?? "all";

  const viewerAmistosoOn = computeDisponivelAmistosoEffective(me.disponivel_amistoso, me.disponivel_amistoso_ate);
  const viewerAmistosoExpiresAt =
    viewerAmistosoOn && me.disponivel_amistoso_ate ? String(me.disponivel_amistoso_ate) : null;

  const esportes = await getEsportesConfrontoCached();
  const esporteIdsDisponiveis = new Set(esportes.map((e) => String(e.id)));

  const [{ data: meusEidsRows }, { data: meusTimesCriados }, { data: minhasMembRows }] = await Promise.all([
    supabase
      .from("usuario_eid")
      .select("esporte_id, modalidades_match")
      .eq("usuario_id", viewerId)
      .order("id", { ascending: true }),
    supabase.from("times").select("id, tipo, esporte_id").eq("criador_id", viewerId),
    supabase
      .from("membros_time")
      .select("time_id, times!inner(id, tipo, esporte_id)")
      .eq("usuario_id", viewerId)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);

  const meusTimesMembro = (minhasMembRows ?? [])
    .map((r) => {
      const t = Array.isArray((r as { times?: unknown }).times)
        ? (r as { times?: Array<{ id?: number | null; tipo?: string | null; esporte_id?: number | null }> }).times?.[0]
        : (r as { times?: { id?: number | null; tipo?: string | null; esporte_id?: number | null } }).times;
      return t ?? null;
    })
    .filter((t): t is { id: number; tipo: string | null; esporte_id: number | null } => Number.isFinite(Number(t?.id)));

  function viewerTimeTipoRank(tipoRaw: string | null): number {
    const t = String(tipoRaw ?? "").trim().toLowerCase();
    if (t === "dupla") return 2;
    if (t === "time") return 1;
    return 0;
  }
  type ViewerTimeNorm = { id: number; tipo: string | null; esporte_id: number | null };
  const rowsMembro: ViewerTimeNorm[] = meusTimesMembro.map((t) => ({
    id: Number(t.id),
    tipo: t.tipo ?? null,
    esporte_id: t.esporte_id ?? null,
  }));
  const rowsCriador: ViewerTimeNorm[] = (meusTimesCriados ?? []).map((t) => {
    const row = t as { id?: number | null; tipo?: string | null; esporte_id?: number | null };
    return {
      id: Number(row.id ?? 0),
      tipo: row.tipo ?? null,
      esporte_id: row.esporte_id ?? null,
    };
  });
  const byTimeId = new Map<number, ViewerTimeNorm>();
  for (const row of [...rowsMembro, ...rowsCriador]) {
    if (!Number.isFinite(row.id) || row.id <= 0) continue;
    const prev = byTimeId.get(row.id);
    if (!prev) {
      byTimeId.set(row.id, row);
      continue;
    }
    const rNew = viewerTimeTipoRank(row.tipo);
    const rPrev = viewerTimeTipoRank(prev.tipo);
    if (rNew > rPrev) {
      byTimeId.set(row.id, {
        id: row.id,
        tipo: row.tipo ?? prev.tipo,
        esporte_id: Number.isFinite(Number(row.esporte_id)) && Number(row.esporte_id) > 0 ? Number(row.esporte_id) : prev.esporte_id,
      });
    } else if (rNew === rPrev && !prev.tipo && row.tipo) {
      byTimeId.set(row.id, { ...prev, tipo: row.tipo });
    }
  }
  const allViewerTimes = Array.from(byTimeId.values());
  const viewerTeamIdsForCooldown = [
    ...new Set(allViewerTimes.map((t) => Number(t.id)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const viewerEsportesComDupla: number[] = [];
  const viewerEsportesComTime: number[] = [];
  for (const t of allViewerTimes) {
    const eid = Number((t as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!Number.isFinite(eid) || eid <= 0) continue;
    const tipoT = String((t as { tipo?: string | null }).tipo ?? "").trim().toLowerCase();
    if (tipoT === "dupla") viewerEsportesComDupla.push(eid);
    else viewerEsportesComTime.push(eid);
  }
  const viewerEsportesComDuplaDedup = [...new Set(viewerEsportesComDupla)];
  const viewerEsportesComTimeDedup = [...new Set(viewerEsportesComTime)];

  const esportesPerfilConfronto: string[] = [];
  const viewerEsportesIndividualNums: number[] = [];
  const seenEidSport = new Set<string>();
  for (const row of meusEidsRows ?? []) {
    const sid = String((row as { esporte_id?: number | null }).esporte_id ?? "");
    if (!sid || !esporteIdsDisponiveis.has(sid)) continue;
    const mods = (row as { modalidades_match?: string[] | null }).modalidades_match;
    const hasIndividual =
      mods == null ||
      !Array.isArray(mods) ||
      mods.length === 0 ||
      mods.some((m) => String(m).trim().toLowerCase() === "individual");
    if (hasIndividual) {
      const n = Number(sid);
      if (Number.isFinite(n) && n > 0) viewerEsportesIndividualNums.push(n);
    }
    if (seenEidSport.has(sid)) continue;
    seenEidSport.add(sid);
    esportesPerfilConfronto.push(sid);
  }
  const viewerEsportesIndividualDedup = [...new Set(viewerEsportesIndividualNums)].filter((id) =>
    esportes.some((e) => e.id === id && isEsportePermitidoDesafioPerfilIndividual(e.tipo, e.permite_individual)),
  );

  const esporteDefault =
    tipo === "todas"
      ? viewerEsportesIndividualDedup.length > 0
        ? String(viewerEsportesIndividualDedup[0])
        : viewerEsportesComDuplaDedup.length > 0
          ? String(viewerEsportesComDuplaDedup[0])
          : viewerEsportesComTimeDedup.length > 0
            ? String(viewerEsportesComTimeDedup[0])
            : "all"
      : tipo === "atleta"
        ? viewerEsportesIndividualDedup.length > 0
          ? String(viewerEsportesIndividualDedup[0])
          : "all"
        : tipo === "dupla"
          ? viewerEsportesComDuplaDedup.length > 0
            ? String(viewerEsportesComDuplaDedup[0])
            : "all"
          : viewerEsportesComTimeDedup.length > 0
            ? String(viewerEsportesComTimeDedup[0])
            : "all";

  const allowedEsporteIdsForTipo = new Set(
    (tipo === "todas"
      ? [...viewerEsportesIndividualDedup, ...viewerEsportesComDuplaDedup, ...viewerEsportesComTimeDedup]
      : tipo === "atleta"
        ? viewerEsportesIndividualDedup
        : tipo === "dupla"
          ? viewerEsportesComDuplaDedup
          : viewerEsportesComTimeDedup
    ).map(String),
  );

  const esporteSelecionado =
    esporteParam === "all"
      ? esporteDefault
      : esporteIdsDisponiveis.has(esporteParam) &&
          (allowedEsporteIdsForTipo.size === 0 || allowedEsporteIdsForTipo.has(esporteParam))
        ? esporteParam
        : esporteDefault;
  const fullRadarEsporteIds =
    esporteParam === "all"
      ? esportesPerfilConfronto.length > 0
        ? esportesPerfilConfronto
        : esporteDefault !== "all"
          ? [esporteDefault]
          : []
      : [esporteSelecionado];
  const fullRadarEsporteIdsResolved =
    fullRadarEsporteIds.length > 0
      ? fullRadarEsporteIds
      : /^\d+$/.test(esporteSelecionado)
        ? [esporteSelecionado]
        : [];
  const fullRadarUnionNums = [
    ...new Set([...viewerEsportesIndividualDedup, ...viewerEsportesComDuplaDedup, ...viewerEsportesComTimeDedup]),
  ];
  const perfilConfrontoNums = esportesPerfilConfronto
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n) && n > 0);
  const fullRadarFetchMergedNums = [...new Set([...fullRadarUnionNums, ...perfilConfrontoNums])];
  const fullRadarFetchEsporteIds =
    fullRadarFetchMergedNums.length > 0
      ? fullRadarFetchMergedNums.map(String)
      : fullRadarEsporteIdsResolved.filter((id) => /^\d+$/.test(id));
  const initialGeneroFiltro = toGeneroFiltro(sp.genero);

  const latN = Number(me.lat);
  const lngN = Number(me.lng);

  async function mergeFullRadarForEsportes(esporteIds: string[]) {
    const ids = esporteIds.filter((id) => /^\d+$/.test(id));
    if (ids.length === 0) return [];
    const perSport = await Promise.all(
      ids.map((eid) =>
        Promise.all([
          fetchMatchRadarCards(supabase, {
            viewerId,
            tipo: "atleta",
            sortBy,
            raio,
            esporteSelecionado: eid,
            lat: latN,
            lng: lngN,
            finalidade: "ranking",
            includeActiveOpponents: true,
          }),
          fetchMatchRadarCards(supabase, {
            viewerId,
            tipo: "atleta",
            sortBy,
            raio,
            esporteSelecionado: eid,
            lat: latN,
            lng: lngN,
            finalidade: "amistoso",
            includeActiveOpponents: true,
          }),
          fetchMatchRadarCards(supabase, {
            viewerId,
            tipo: "dupla",
            sortBy,
            raio,
            esporteSelecionado: eid,
            lat: latN,
            lng: lngN,
            finalidade: "ranking",
            includeActiveOpponents: true,
          }),
          fetchMatchRadarCards(supabase, {
            viewerId,
            tipo: "time",
            sortBy,
            raio,
            esporteSelecionado: eid,
            lat: latN,
            lng: lngN,
            finalidade: "ranking",
            includeActiveOpponents: true,
          }),
        ]),
      ),
    );
    const merged = perSport.flat(2);
    const byKey = new Map<string, (typeof merged)[number]>();
    for (const card of merged) {
      const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, card);
        continue;
      }
      if (prev.interesseMatch !== "ranking_e_amistoso" && card.interesseMatch === "ranking_e_amistoso") {
        byKey.set(key, card);
      }
    }
    const dedupedFull = Array.from(byKey.values());
    return filterMatchRadarCardsByRankingCooldown(supabase, {
      viewerId,
      viewerTeamIds: viewerTeamIdsForCooldown,
      finalidade: matchFinalidade,
      cards: dedupedFull,
    });
  }

  const initialTodasEsporteIds: string[] =
    tipo === "todas" && initialView !== "full"
      ? esporteSelecionado !== "all" && /^\d+$/.test(esporteSelecionado)
        ? [esporteSelecionado]
        : fullRadarFetchMergedNums.length > 0
          ? fullRadarFetchMergedNums.map(String)
          : /^\d+$/.test(String(esporteSelecionado))
            ? [String(esporteSelecionado)]
            : []
      : [];

  const gridFetchIds: string[] =
    tipo === "todas" || initialView === "full"
      ? []
      : (() => {
          const paramDigit = esporteParam !== "all" && /^\d+$/.test(esporteParam);
          const allowedEmpty = allowedEsporteIdsForTipo.size === 0;
          if (paramDigit && (allowedEmpty || allowedEsporteIdsForTipo.has(esporteParam))) {
            return [esporteParam];
          }
          const sel = esporteSelecionado;
          if (sel !== "all" && /^\d+$/.test(sel) && (allowedEmpty || allowedEsporteIdsForTipo.has(sel))) {
            return [sel];
          }
          return [...allowedEsporteIdsForTipo].filter((id) => /^\d+$/.test(id));
        })();

  const initialCards =
    initialView === "full"
      ? await mergeFullRadarForEsportes(fullRadarFetchEsporteIds)
      : tipo === "todas"
        ? initialTodasEsporteIds.length > 0
          ? await fetchMatchRadarCardsTodasMerged(supabase, {
              viewerId,
              sortBy,
              raio,
              esporteIds: initialTodasEsporteIds,
              lat: latN,
              lng: lngN,
              finalidade: matchFinalidade,
              viewerTeamIds: viewerTeamIdsForCooldown,
            })
          : []
        : gridFetchIds.length === 0
          ? []
          : gridFetchIds.length === 1
            ? await fetchMatchRadarCards(supabase, {
                viewerId,
                tipo,
                sortBy,
                raio,
                esporteSelecionado: gridFetchIds[0]!,
                lat: Number(me.lat),
                lng: Number(me.lng),
                finalidade: matchFinalidade,
              })
            : await fetchMatchRadarCardsMultiSameTipo(supabase, {
                viewerId,
                tipo,
                sortBy,
                raio,
                esporteIds: gridFetchIds,
                lat: Number(me.lat),
                lng: Number(me.lng),
                finalidade: matchFinalidade,
              });

  const initialViewResolved: RadarViewMode =
    initialView === "full" && initialCards.length === 0 ? "grid" : initialView;

  const initialEsporteFiltro =
    initialViewResolved === "full"
      ? "all"
      : esporteParam === "all"
        ? "all"
        : esporteSelecionado;

  return (
    <MatchRadarApp
      viewerId={viewerId}
      initialCards={initialCards}
      esportes={esportes}
      initialEsporteFiltro={initialEsporteFiltro}
      fullRadarFetchEsporteIds={fullRadarFetchEsporteIds}
      initialTipo={tipo}
      initialSortBy={sortBy}
      initialRaio={raio}
      initialFinalidade={matchFinalidade}
      initialView={initialViewResolved}
      initialGeneroFiltro={initialGeneroFiltro}
      viewerDisponivelAmistoso={viewerAmistosoOn}
      viewerAmistosoExpiresAt={viewerAmistosoExpiresAt}
      showSentBanner={sp.status === "enviado"}
      viewerEsportesComDupla={viewerEsportesComDuplaDedup}
      viewerEsportesComTime={viewerEsportesComTimeDedup}
      viewerEsportesIndividual={viewerEsportesIndividualDedup}
      hideHero={hideHero}
    />
  );
}
