import Link from "next/link";
import { redirect } from "next/navigation";
import {
  RankingFilterBar,
  RankingPeriodToggle,
  RankingRankToggle,
  RankingPodium,
  RankingRow,
  ViewerRankCard,
  type PodiumSlot,
} from "@/components/ranking/ranking-compact";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { parseRankingSearch, rankingHref, type RankingSearchState } from "@/lib/ranking/ranking-href";
import { isSportRankingEnabled } from "@/lib/sport-capabilities";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Ranking",
  description: "Ranking EsporteID",
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileMini = { nome?: string | null; avatar_url?: string | null; localizacao?: string | null };
type SportMini = { nome?: string | null };

type UsuarioEidRow = {
  usuario_id: string;
  esporte_id: number;
  nota_eid?: number | null;
  pontos_ranking?: number | null;
  profiles?: ProfileMini | ProfileMini[] | null;
  esportes?: SportMini | SportMini[] | null;
};

type TimeRow = {
  id: number;
  nome?: string | null;
  escudo?: string | null;
  localizacao?: string | null;
  pontos_ranking?: number | null;
  eid_time?: number | null;
  esporte_id?: number | null;
  tipo?: string | null;
  esportes?: SportMini | SportMini[] | null;
};

type MeuEsporteRow = {
  esporte_id: number;
  esportes?: SportMini | SportMini[] | null;
};

type UnifiedRank = {
  key: string;
  nome: string;
  avatarUrl: string | null;
  pontos: number;
  notaEid: number;
  usuarioId?: string;
  timeId?: number;
  href: string;
};
type PartidaPeriodoRow = {
  jogador1_id?: string | null;
  jogador2_id?: string | null;
  time1_id?: number | string | null;
  time2_id?: number | string | null;
  data_resultado?: string | null;
  data_partida?: string | null;
  data_registro?: string | null;
};

function timestampPartidaNoMesAtual(p: PartidaPeriodoRow, monthStartMs: number, nextMonthStartMs: number): boolean {
  const raw = p.data_resultado ?? p.data_partida ?? p.data_registro;
  if (raw == null || raw === "") return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= monthStartMs && t < nextMonthStartMs;
}

function numTimeId(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const LIST_PAGE_SIZE = 10;

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function normalizeCityHint(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const part = s.split(",")[0]?.trim() ?? s;
  return part.toLowerCase();
}

function cidadeDisplayFromProfile(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const part = s.split(",")[0]?.trim() ?? s;
  return part || null;
}

function bestViewerRankIndex(rows: UnifiedRank[], viewerId: string, teamIds: Set<number>, mode: RankingSearchState["tipo"]): number | null {
  let best: number | null = null;
  rows.forEach((r, i) => {
    if (mode === "individual") {
      if (r.usuarioId === viewerId) {
        if (best === null || i < best) best = i;
      }
    } else {
      if (r.timeId !== undefined && teamIds.has(r.timeId)) {
        if (best === null || i < best) best = i;
      }
    }
  });
  return best;
}

function toPodiumSlot(row: UnifiedRank | undefined, place: string): PodiumSlot | null {
  if (!row) return null;
  return {
    place,
    nome: row.nome,
    avatarUrl: row.avatarUrl,
    notaEid: row.notaEid,
    pontos: row.pontos,
    href: row.href,
  };
}

export default async function RankingPage({ searchParams }: Props) {
  const spRaw = (await searchParams) ?? {};
  const state = parseRankingSearch(spRaw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ranking");
  const viewerId = user.id;

  const [{ data: me }, { data: meusEsportesRaw }, { data: criados }, { data: membro }, { data: esportesCatalogoRaw }] = await Promise.all([
    supabase.from("profiles").select("localizacao").eq("id", viewerId).maybeSingle(),
    supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", viewerId).order("esporte_id", { ascending: true }),
    supabase.from("times").select("id").eq("criador_id", viewerId),
    supabase.from("membros_time").select("time_id").eq("usuario_id", viewerId).eq("status", "ativo"),
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
  ]);

  const meusEsportes = (meusEsportesRaw ?? []) as MeuEsporteRow[];
  const esportePrincipalId = meusEsportes[0]?.esporte_id ?? null;

  const todosEsportes = (esportesCatalogoRaw ?? [])
    .filter((e): e is { id: number; nome: string | null } => typeof (e as { id?: number }).id === "number" && Number.isFinite((e as { id: number }).id))
    .filter((e) => isSportRankingEnabled(e.nome))
    .map((e) => ({
      id: e.id,
      nome: String(e.nome ?? "").trim() || "Esporte",
    }));

  const allEsporteIds = new Set(todosEsportes.map((e) => e.id));

  const parsedEsporteParam = Number(state.esporte);
  let selectedEsporteId: number | null = null;
  if (Number.isFinite(parsedEsporteParam) && parsedEsporteParam > 0 && allEsporteIds.has(parsedEsporteParam)) {
    selectedEsporteId = parsedEsporteParam;
  } else if (esportePrincipalId != null && allEsporteIds.has(esportePrincipalId)) {
    selectedEsporteId = esportePrincipalId;
  } else {
    selectedEsporteId = todosEsportes[0]?.id ?? null;
  }

  const cidadeDisplay = cidadeDisplayFromProfile(me?.localizacao ?? null);
  const needsCidadeFallback = state.local === "cidade" && !cidadeDisplay;

  const myTeamIds = new Set<number>();
  for (const r of criados ?? []) {
    if (typeof r.id === "number") myTeamIds.add(r.id);
  }
  for (const r of membro ?? []) {
    const id = Number(r.time_id);
    if (Number.isFinite(id)) myTeamIds.add(id);
  }

  const cityNeedle = state.local === "cidade" ? normalizeCityHint(me?.localizacao ?? null) : "";

  let rankingAll: UnifiedRank[] = [];

  if (selectedEsporteId != null) {
    if (state.tipo === "individual") {
      let q = supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid, pontos_ranking, profiles!inner(nome, avatar_url, localizacao)")
        .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("nota_eid", { ascending: false });
      const { data: raw } = await q;
      const rows = ((raw ?? []) as UsuarioEidRow[]).filter((r) => {
        if (!cityNeedle) return true;
        const p = firstOf(r.profiles);
        const loc = String(p?.localizacao ?? "").toLowerCase();
        return loc.includes(cityNeedle);
      });
      rankingAll = rows.map((r) => {
        const p = firstOf(r.profiles);
        const uid = r.usuario_id;
        return {
          key: `u-${uid}-${r.esporte_id}`,
          usuarioId: uid,
          nome: p?.nome ?? "Atleta",
          avatarUrl: p?.avatar_url ?? null,
          pontos: Number(r.pontos_ranking ?? 0),
          notaEid: Number(r.nota_eid ?? 0),
          href: `/perfil/${uid}`,
        };
      });
    } else {
      const tipoTime = state.tipo === "dupla" ? "dupla" : "time";
      let q = supabase
        .from("times")
        .select("id, nome, escudo, localizacao, pontos_ranking, eid_time, esporte_id, tipo")
        .eq("tipo", tipoTime)
        .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("eid_time", { ascending: false });
      const { data: raw } = await q;
      const rows = ((raw ?? []) as TimeRow[]).filter((r) => {
        if (!cityNeedle) return true;
        const loc = String(r.localizacao ?? "").toLowerCase();
        return loc.includes(cityNeedle);
      });
      rankingAll = rows.map((r) => ({
        key: `t-${r.id}-${r.esporte_id ?? 0}`,
        timeId: r.id,
        nome: r.nome?.trim() || "Equipe",
        avatarUrl: r.escudo ?? null,
        pontos: Number(r.pontos_ranking ?? 0),
        notaEid: Number(r.eid_time ?? 0),
        href: state.tipo === "dupla" ? `/perfil-dupla/${r.id}` : `/perfil-time/${r.id}`,
      }));
    }
  }

  if (state.periodo === "mes" && selectedEsporteId != null) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthStartMs = monthStart.getTime();
    const nextMonthStartMs = nextMonthStart.getTime();
    const monthStartIso = monthStart.toISOString();
    const nextMonthStartIso = nextMonthStart.toISOString();
    const partidaSelect =
      state.tipo === "individual"
        ? "jogador1_id, jogador2_id, data_resultado, data_partida, data_registro"
        : "time1_id, time2_id, data_resultado, data_partida, data_registro";

    const { data: partidasBrutas } = await supabase
      .from("partidas")
      .select(partidaSelect)
      .eq("esporte_id", selectedEsporteId)
      .or(
        `and(data_resultado.gte.${monthStartIso},data_resultado.lt.${nextMonthStartIso}),and(data_partida.gte.${monthStartIso},data_partida.lt.${nextMonthStartIso}),and(data_registro.gte.${monthStartIso},data_registro.lt.${nextMonthStartIso})`
      )
      .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"]);

    const rows = ((partidasBrutas ?? []) as PartidaPeriodoRow[]).filter((p) =>
      timestampPartidaNoMesAtual(p, monthStartMs, nextMonthStartMs)
    );

    const activeUsers = new Set<string>();
    const activeTeams = new Set<number>();
    rows.forEach((p) => {
      if (p.jogador1_id) activeUsers.add(String(p.jogador1_id));
      if (p.jogador2_id) activeUsers.add(String(p.jogador2_id));
      const t1 = numTimeId(p.time1_id);
      const t2 = numTimeId(p.time2_id);
      if (t1 != null) activeTeams.add(t1);
      if (t2 != null) activeTeams.add(t2);
    });

    rankingAll = rankingAll.filter((r) => {
      if (state.tipo === "individual") return !!r.usuarioId && activeUsers.has(String(r.usuarioId));
      return typeof r.timeId === "number" && activeTeams.has(r.timeId);
    });
  }

  const podiumRows = rankingAll.slice(0, 3);
  const afterPodium = rankingAll.slice(3);
  const start = (state.page - 1) * LIST_PAGE_SIZE;
  const pageSlice = afterPodium.slice(start, start + LIST_PAGE_SIZE);
  const hasMore = afterPodium.length > start + LIST_PAGE_SIZE;

  const viewerIdx = bestViewerRankIndex(rankingAll, viewerId, myTeamIds, state.tipo);
  const viewerRank = viewerIdx === null ? null : viewerIdx + 1;
  const showViewerCard = viewerRank !== null && viewerRank > 10;

  const podiumSecond = toPodiumSlot(podiumRows[1], "2º");
  const podiumFirst = toPodiumSlot(podiumRows[0], "1º");
  const podiumThird = toPodiumSlot(podiumRows[2], "3º");

  const noCatalogHint = todosEsportes.length === 0;
  const esporteNomeAtual =
    selectedEsporteId != null ? todosEsportes.find((e) => e.id === selectedEsporteId)?.nome ?? null : null;
  const rankBadgeLabel = state.rank === "eid" ? "EID" : "Desafio";
  const periodoBadgeLabel = state.periodo === "mes" ? "Mês" : "Ano";

  return (
    <div className="relative z-0 flex w-full min-w-0 flex-col" data-eid-ranking-page>
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 max-h-[24rem] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)] sm:h-64"
        aria-hidden
      />
      <main className="relative z-[1] mx-auto flex w-full min-w-0 max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
        <div className={`eid-ranking-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">Painel competitivo</p>
          <h1 className="mt-1 text-base font-black leading-tight text-eid-fg sm:text-lg">Ranking EID</h1>
          <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
            Posições por esporte, modalidade e período. Compare desafios (pontos) ou nota EID.
          </p>
        </div>

        <section className="mt-4 md:mt-6">
          <div className="eid-ranking-card overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
            <div className="eid-ranking-card-head flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <h2 className="eid-ranking-section-title text-[10px] font-black uppercase tracking-[0.16em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                Filtros
              </h2>
              <span className="eid-ranking-badge rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
                Busca
              </span>
            </div>
            <div className="p-2.5 sm:p-3">
              <RankingFilterBar
                state={state}
                principalEsporteId={esportePrincipalId}
                selectedEsporteId={selectedEsporteId}
                cidadeDisplay={cidadeDisplay}
                needsCidadeFallback={needsCidadeFallback}
                todosEsportes={todosEsportes}
              />
            </div>
          </div>
        </section>

        {noCatalogHint ? (
          <p className="eid-ranking-empty mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-5 text-center text-sm leading-relaxed text-eid-text-secondary shadow-[0_10px_22px_-16px_rgba(15,23,42,0.2)]">
            Nenhum esporte disponível no momento.
          </p>
        ) : (
          <>
            {state.page === 1 ? (
              <section className="mt-4 md:mt-6">
                <RankingPodium
                  second={podiumSecond}
                  first={podiumFirst}
                  third={podiumThird}
                  rankKind={state.rank}
                  rankToggle={<RankingRankToggle state={state} principalEsporteId={esportePrincipalId} />}
                  periodToggle={<RankingPeriodToggle state={state} principalEsporteId={esportePrincipalId} />}
                />
              </section>
            ) : null}

            {showViewerCard && viewerRank !== null ? (
              <div className="mt-3 md:mt-4">
                <ViewerRankCard rank={viewerRank} />
              </div>
            ) : null}

            {rankingAll.length === 0 ? (
              <p className="eid-ranking-empty mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-6 text-center text-sm text-eid-text-secondary shadow-[0_10px_22px_-16px_rgba(15,23,42,0.2)]">
                Nenhum resultado para estes filtros.
              </p>
            ) : null}

            {rankingAll.length > 0 ? (
              <>
                <section className="relative z-[1] mt-4 md:mt-6">
                  <div className="eid-ranking-card overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
                    <div className="eid-ranking-card-head flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                      <h2 className="eid-ranking-section-title text-[10px] font-black uppercase tracking-[0.16em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                        Classificação
                      </h2>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {esporteNomeAtual ? (
                          <span className="eid-ranking-badge-action rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-action-500)_38%)]">
                            {esporteNomeAtual}
                          </span>
                        ) : null}
                        <span className="eid-ranking-badge rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
                          {rankBadgeLabel} · {periodoBadgeLabel}
                        </span>
                      </div>
                    </div>
                    <div className="eid-ranking-list-inner px-2.5 sm:px-3">
                    {pageSlice.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-center">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] shadow-[0_8px_16px_-12px_rgba(37,99,235,0.55)]"
                          aria-hidden
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                            <path d="M7 4h10v2h2a1 1 0 0 1 1 1v2a4.5 4.5 0 0 1-4 4.47A5.02 5.02 0 0 1 13 16.8V19h3v2H8v-2h3v-2.2a5.02 5.02 0 0 1-3-3.33A4.5 4.5 0 0 1 4 9V7a1 1 0 0 1 1-1h2V4zm-1 4v1a2.5 2.5 0 0 0 2 2.45V8H6zm12 0v3.45A2.5 2.5 0 0 0 20 9V8h-2z" />
                          </svg>
                        </span>
                        <p className="text-xs font-medium text-eid-text-secondary">Sem resultados aqui</p>
                      </div>
                    ) : (
                      pageSlice.map((row, i) => {
                        const rank = 4 + start + i;
                        return (
                          <RankingRow
                            key={row.key}
                            rank={rank}
                            nome={row.nome}
                            metricValue={state.rank === "eid" ? row.notaEid : row.pontos}
                            metricKind={state.rank === "eid" ? "eid" : "pontos"}
                            eidScore={row.notaEid}
                            avatarUrl={row.avatarUrl}
                            href={row.href}
                          />
                        );
                      })
                    )}
                    </div>
                  </div>
                </section>

                {hasMore ? (
                  <div className="mt-4 flex justify-center pb-1">
                    <Link
                      href={rankingHref({ page: state.page + 1 }, state, esportePrincipalId)}
                      className="eid-ranking-cta inline-flex min-h-10 items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-6 text-[11px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] shadow-[0_6px_18px_-12px_rgba(37,99,235,0.45)] transition-all duration-200 ease-out motion-safe:transform-gpu hover:-translate-y-px hover:bg-eid-primary-500/18 active:translate-y-0 active:scale-[0.98] md:text-xs"
                    >
                      Ver mais
                    </Link>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
