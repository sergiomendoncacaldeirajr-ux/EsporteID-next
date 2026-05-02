import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchPageShell } from "@/components/match/match-page-shell";
import { MatchRadarApp } from "@/components/match/match-radar-app";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { getEsportesConfrontoCached } from "@/lib/match/esportes-confronto";
import { isEsportePermitidoDesafioPerfilIndividual } from "@/lib/match/esporte-match-individual-policy";
import {
  fetchMatchRadarCards,
  fetchMatchRadarCardsMultiSameTipo,
  fetchMatchRadarCardsTodasMerged,
  type MatchRadarFinalidade,
  type RadarTipo,
  type SortBy,
} from "@/lib/match/radar-snapshot";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";

type Search = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  sort_by?: string;
  status?: string;
  finalidade?: string;
  view?: string;
  genero?: string;
};

type RadarViewMode = "full" | "grid";
type RadarGeneroFiltro = "all" | "masculino" | "feminino" | "outro";

function toTipo(v: string | undefined): RadarTipo {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "dupla" || s === "time" || s === "todas") return s;
  return "atleta";
}

function toSortBy(v: string | undefined): SortBy {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "eid_score") return "eid_score";
  return "match_ranking_points";
}

function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

function toMatchFinalidade(v: string | undefined): MatchRadarFinalidade {
  return String(v ?? "").trim().toLowerCase() === "amistoso" ? "amistoso" : "ranking";
}

function toViewMode(v: string | undefined): RadarViewMode {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "full") return "full";
  return "grid";
}

function toGeneroFiltro(v: string | undefined): RadarGeneroFiltro {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "masculino" || raw === "feminino" || raw === "outro" || raw === "all") return raw;
  return "all";
}

export default async function MatchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {};
  const tipo = toTipo(sp.tipo);
  const matchFinalidade = toMatchFinalidade(sp.finalidade);
  const initialView = toViewMode(sp.view);
  if (initialView !== "full" && matchFinalidade === "amistoso" && tipo !== "atleta" && tipo !== "todas") {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v.length > 0) q.set(k, v);
    }
    q.set("tipo", "atleta");
    q.set("finalidade", "amistoso");
    redirect(`/match?${q.toString()}`);
  }
  const sortBy = toSortBy(sp.sort_by);
  const raio = toRaio(sp.raio);
  const esporteParam = sp.esporte ?? "all";

  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/match");

  const [gate, { data: me }] = await Promise.all([
    getCachedProfileLegalRow(user.id),
    supabase
      .from("profiles")
      .select("id, lat, lng, genero, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (!gate || !legalAcceptanceIsCurrent(gate)) redirect("/conta/aceitar-termos");
  if (!gate.perfil_completo) redirect("/onboarding");
  if (!me) redirect("/onboarding");

  const qs = new URLSearchParams();
  if (sp.tipo) qs.set("tipo", sp.tipo);
  if (sp.esporte) qs.set("esporte", sp.esporte);
  if (sp.raio) qs.set("raio", sp.raio);
  if (sp.sort_by) qs.set("sort_by", sp.sort_by);
  if (sp.status) qs.set("status", sp.status);
  if (sp.finalidade) qs.set("finalidade", sp.finalidade);
  const matchNext = safeNextInternalPath(qs.toString() ? `/match?${qs}` : "/match");
  if (!(me as { match_maioridade_confirmada?: boolean }).match_maioridade_confirmada) {
    redirect(`/conta/confirmar-maioridade-match?next=${encodeURIComponent(matchNext)}`);
  }
  const viewerAmistosoOn = computeDisponivelAmistosoEffective(
    me.disponivel_amistoso,
    me.disponivel_amistoso_ate
  );
  const viewerAmistosoExpiresAt = viewerAmistosoOn && me.disponivel_amistoso_ate ? String(me.disponivel_amistoso_ate) : null;
  const hasLocation = Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng));

  if (!hasLocation) {
    return (
      <MatchPageShell fullBleed={initialView === "full"}>
        <header
          className={`eid-match-hero relative mb-3 mt-0 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative z-[1] space-y-1">
            <div className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
                aria-hidden
              />
              Radar de oponentes
            </div>
            <h1 className="text-[1.35rem] font-black tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.6rem]">
              Desafio
            </h1>
            <p className="max-w-prose text-[10px] leading-snug text-eid-text-secondary sm:text-[11px]">
              Ative a localização para ver atletas e formações perto de você. Depois você filtra esporte, raio e modalidade sem sair da tela.
            </p>
          </div>
        </header>
        <MatchLocationPrompt hasLocation={false} />
      </MatchPageShell>
    );
  }

  const esportes = await getEsportesConfrontoCached();
  const esporteIdsDisponiveis = new Set(esportes.map((e) => String(e.id)));

  const [{ data: meusEidsRows }, { data: meusTimesCriados }, { data: minhasMembRows }] = await Promise.all([
    supabase
      .from("usuario_eid")
      .select("esporte_id, modalidades_match")
      .eq("usuario_id", user.id)
      .order("id", { ascending: true }),
    supabase.from("times").select("id, tipo, esporte_id").eq("criador_id", user.id),
    supabase
      .from("membros_time")
      .select("time_id, times!inner(id, tipo, esporte_id)")
      .eq("usuario_id", user.id)
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

  /** Mesma convenção que `formacaoKindFromTipoRaw` + prioridade explícita dupla/time sobre null (evita “primeiro vence” líder vs membro). */
  function viewerTimeTipoRank(tipo: string | null): number {
    const t = String(tipo ?? "").trim().toLowerCase();
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
    esportes.some((e) => e.id === id && isEsportePermitidoDesafioPerfilIndividual(e.tipo, e.permite_individual))
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
    ).map(String)
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
    ...new Set([
      ...viewerEsportesIndividualDedup,
      ...viewerEsportesComDuplaDedup,
      ...viewerEsportesComTimeDedup,
    ]),
  ];
  /** Todos os esportes com EID de confronto no perfil (inclui time/dupla só no cadastro EID, ainda sem `times`). */
  const perfilConfrontoNums = esportesPerfilConfronto
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n) && n > 0);
  const fullRadarFetchMergedNums = [...new Set([...fullRadarUnionNums, ...perfilConfrontoNums])];
  /** Tela cheia: busca sugestões em toda união (modalidades nas formações + qualquer esporte do perfil em confronto). */
  const fullRadarFetchEsporteIds =
    fullRadarFetchMergedNums.length > 0
      ? fullRadarFetchMergedNums.map(String)
      : fullRadarEsporteIdsResolved.filter((id) => /^\d+$/.test(id));
  const initialGeneroFiltro = toGeneroFiltro(sp.genero);

  const latN = Number(me.lat);
  const lngN = Number(me.lng);
  const viewerId = user.id;

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
        ])
      )
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
    return Array.from(byKey.values());
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

  /** Grade (não “todas”): só esportes permitidos para a aba; nunca RPC com esporte null. */
  const gridFetchIds: string[] =
    tipo === "todas" || initialView === "full"
      ? []
      : (() => {
          const paramDigit = esporteParam !== "all" && /^\d+$/.test(esporteParam);
          const allowedEmpty = allowedEsporteIdsForTipo.size === 0;
          if (
            paramDigit &&
            (allowedEmpty || allowedEsporteIdsForTipo.has(esporteParam))
          ) {
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
              viewerId: user.id,
              sortBy,
              raio,
              esporteIds: initialTodasEsporteIds,
              lat: latN,
              lng: lngN,
              finalidade: matchFinalidade,
            })
          : []
        : gridFetchIds.length === 0
          ? []
          : gridFetchIds.length === 1
            ? await fetchMatchRadarCards(supabase, {
                viewerId: user.id,
                tipo,
                sortBy,
                raio,
                esporteSelecionado: gridFetchIds[0]!,
                lat: Number(me.lat),
                lng: Number(me.lng),
                finalidade: matchFinalidade,
              })
            : await fetchMatchRadarCardsMultiSameTipo(supabase, {
                viewerId: user.id,
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

  /** Tela cheia mistura modalidades; filtrar pelo esporte da grade escondia times em outro esporte. */
  const initialEsporteFiltro =
    initialViewResolved === "full"
      ? "all"
      : esporteParam === "all"
        ? "all"
        : esporteSelecionado;

  return (
    <MatchPageShell fullBleed={initialViewResolved === "full"}>
      <MatchRadarApp
        viewerId={user.id}
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
      />
    </MatchPageShell>
  );
}
