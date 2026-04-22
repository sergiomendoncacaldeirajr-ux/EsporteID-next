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
  time1_id?: number | null;
  time2_id?: number | null;
};

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
    supabase.from("usuario_eid").select("esporte_id, esportes(nome)").eq("usuario_id", viewerId).order("esporte_id", { ascending: true }),
    supabase.from("times").select("id").eq("criador_id", viewerId),
    supabase.from("membros_time").select("time_id").eq("usuario_id", viewerId).eq("status", "ativo"),
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
  ]);

  const meusEsportes = (meusEsportesRaw ?? []) as MeuEsporteRow[];
  const esportePrincipalId = meusEsportes[0]?.esporte_id ?? null;

  const todosEsportes = (esportesCatalogoRaw ?? [])
    .filter((e): e is { id: number; nome: string | null } => typeof (e as { id?: number }).id === "number" && Number.isFinite((e as { id: number }).id))
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
        .select("usuario_id, esporte_id, nota_eid, pontos_ranking, profiles!inner(nome, avatar_url, localizacao), esportes!inner(nome)")
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
        .select("id, nome, escudo, localizacao, pontos_ranking, eid_time, esporte_id, tipo, esportes(nome)")
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: partidasPeriodo } = await supabase
      .from("partidas")
      .select("jogador1_id, jogador2_id, time1_id, time2_id")
      .eq("esporte_id", selectedEsporteId)
      .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"])
      .gte("data_registro", monthStart)
      .lt("data_registro", nextMonthStart);

    const rows = (partidasPeriodo ?? []) as PartidaPeriodoRow[];
    const activeUsers = new Set<string>();
    const activeTeams = new Set<number>();
    rows.forEach((p) => {
      if (p.jogador1_id) activeUsers.add(p.jogador1_id);
      if (p.jogador2_id) activeUsers.add(p.jogador2_id);
      if (typeof p.time1_id === "number") activeTeams.add(p.time1_id);
      if (typeof p.time2_id === "number") activeTeams.add(p.time2_id);
    });

    rankingAll = rankingAll.filter((r) => {
      if (state.tipo === "individual") return !!r.usuarioId && activeUsers.has(r.usuarioId);
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
    <div className="relative flex min-h-full flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,28rem)] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-3 pt-1 sm:max-w-2xl sm:px-6 sm:pb-4 sm:pt-2">
        <header className="mb-1.5 sm:mb-2">
          <h1 className="text-xl font-bold tracking-tight text-eid-fg md:text-2xl">Ranking</h1>
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
          <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 p-5 text-center text-sm leading-relaxed text-eid-text-secondary backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]">
            Nenhum esporte disponível no momento.
          </p>
        ) : (
          <>
            {state.page === 1 ? (
              <RankingPodium
                second={podiumSecond}
                first={podiumFirst}
                third={podiumThird}
                rankToggle={<RankingRankToggle state={state} principalEsporteId={esportePrincipalId} />}
                periodToggle={<RankingPeriodToggle state={state} principalEsporteId={esportePrincipalId} />}
              />
            ) : null}

            {showViewerCard && viewerRank !== null ? <ViewerRankCard rank={viewerRank} /> : null}

            {rankingAll.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 p-6 text-center text-sm text-eid-text-secondary backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]">
                Nenhum resultado para estes filtros.
              </p>
            ) : null}

            {rankingAll.length > 0 ? (
              <>
                <section className="mt-2 sm:mt-2.5">
                  <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Classificação</h2>
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 px-2.5 backdrop-blur-sm shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)] sm:px-3.5">
                    {pageSlice.length === 0 ? (
                      <p className="py-5 text-center text-sm text-eid-text-secondary">Fim da lista.</p>
                    ) : (
                      pageSlice.map((row, i) => {
                        const rank = 4 + start + i;
                        return (
                          <RankingRow
                            key={row.key}
                            rank={rank}
                            nome={row.nome}
                            pontos={row.pontos}
                            avatarUrl={row.avatarUrl}
                            href={row.href}
                          />
                        );
                      })
                    )}
                  </div>
                </section>

                {hasMore ? (
                  <div className="mt-3 flex justify-center sm:mt-4">
                    <Link
                      href={rankingHref({ page: state.page + 1 }, state, esportePrincipalId)}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/[0.08] px-7 text-sm font-bold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/12"
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
