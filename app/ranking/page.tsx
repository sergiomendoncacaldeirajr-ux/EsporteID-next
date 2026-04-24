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

  return (
    <div className="relative z-0 flex w-full min-w-0 flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-56 max-h-[28rem] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)] sm:h-72"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 pb-3 pt-1.5 sm:px-5">
        <header className="mb-1.5">
          <div className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
              aria-hidden
            />
            Painel competitivo
          </div>
          <h1 className="mt-1 text-[1.45rem] font-black tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.7rem]">
            Ranking
          </h1>
        </header>

        <RankingFilterBar
          state={state}
          principalEsporteId={esportePrincipalId}
          selectedEsporteId={selectedEsporteId}
          cidadeDisplay={cidadeDisplay}
          needsCidadeFallback={needsCidadeFallback}
          todosEsportes={todosEsportes}
        />

        {noCatalogHint ? (
          <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-5 text-center text-sm leading-relaxed text-eid-text-secondary backdrop-blur-sm shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)]">
            Nenhum esporte disponível no momento.
          </p>
        ) : (
          <>
            {state.page === 1 ? (
              <RankingPodium
                second={podiumSecond}
                first={podiumFirst}
                third={podiumThird}
                rankKind={state.rank}
                rankToggle={<RankingRankToggle state={state} principalEsporteId={esportePrincipalId} />}
                periodToggle={<RankingPeriodToggle state={state} principalEsporteId={esportePrincipalId} />}
              />
            ) : null}

            {showViewerCard && viewerRank !== null ? <ViewerRankCard rank={viewerRank} /> : null}

            {rankingAll.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-6 text-center text-sm text-eid-text-secondary backdrop-blur-sm shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)]">
                Nenhum resultado para estes filtros.
              </p>
            ) : null}

            {rankingAll.length > 0 ? (
              <>
                <section className="relative z-[1] mt-2">
                  <h2 className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Classificação geral</h2>
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-2.5 backdrop-blur-sm shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] sm:px-3">
                    {pageSlice.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-center">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 text-eid-primary-300 shadow-[0_8px_16px_-12px_rgba(37,99,235,0.55)]"
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
                </section>

                {hasMore ? (
                  <div className="mt-3 flex justify-center">
                    <Link
                      href={rankingHref({ page: state.page + 1 }, state, esportePrincipalId)}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-5 text-xs font-medium text-eid-fg transition-all duration-200 ease-out motion-safe:transform-gpu hover:-translate-y-[1px] hover:border-[color:var(--eid-border)] hover:bg-eid-surface/85 active:translate-y-0 active:scale-[0.98]"
                    >
                      Ver mais
                    </Link>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
