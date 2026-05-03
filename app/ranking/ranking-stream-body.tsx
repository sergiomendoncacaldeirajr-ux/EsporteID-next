import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RankingGenderToggle,
  RankingPeriodToggle,
  RankingPodium,
  RankingRankToggle,
  RankingRow,
  ViewerRankCard,
} from "@/components/ranking/ranking-compact";
import { rankingHref, type RankingSearchState } from "@/lib/ranking/ranking-href";
import { RankingLoadMoreButton } from "@/components/ranking/ranking-load-more-button";
import {
  bestViewerRankIndex,
  firstOf,
  LIST_PAGE_SIZE,
  matchBucketFormacoes,
  matchBucketIndividual,
  numTimeId,
  normalizeGeneroRanking,
  normalizeSearchText,
  teamBucketFromMembers,
  timestampPartidaNoMesAtual,
  toPodiumSlot,
  type GeneroBucket,
  type PartidaPeriodoRow,
  type PartidaRankingRow,
  type TimeRow,
  type UnifiedRank,
  type UsuarioEidRow,
} from "./ranking-page-utils";
import {
  rankingBadgeActionClass,
  rankingBadgePrimaryClass,
  rankingCardHeadWrapClass,
  rankingCardShellClass,
  rankingSectionTitleClass,
} from "./ranking-layout-classes";

export type RankingStreamBodyProps = {
  supabase: SupabaseClient;
  viewerId: string;
  state: RankingSearchState;
  stateComGenero: RankingSearchState;
  selectedEsporteId: number | null;
  myTeamIds: Set<number>;
  cityNeedle: string;
  todosEsportes: Array<{ id: number; nome: string }>;
  esportePrincipalId: number | null;
};

export async function RankingStreamBody({
  supabase,
  viewerId,
  state,
  stateComGenero,
  selectedEsporteId,
  myTeamIds,
  cityNeedle,
  todosEsportes,
  esportePrincipalId,
}: RankingStreamBodyProps) {
  let rankingAll: UnifiedRank[] = [];
  let partidasRanking: PartidaRankingRow[] = [];
  let pontosVitoriaRegra = 10;
  let pontosDerrotaRegra = 4;

  if (selectedEsporteId != null && stateComGenero.rank === "match") {
    const [{ data: regras }, { data: partidasBrutas }] = await Promise.all([
      supabase.from("regras_ranking_match").select("pontos_vitoria, pontos_derrota").eq("esporte_id", selectedEsporteId).maybeSingle(),
      supabase
        .from("partidas")
        .select("id, jogador1_id, jogador2_id, time1_id, time2_id, vencedor_id, placar_1, placar_2, placar_desafiante, placar_desafiado, data_resultado, data_partida, data_registro")
        .eq("esporte_id", selectedEsporteId)
        .eq("tipo_partida", "ranking")
        .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"]),
    ]);
    pontosVitoriaRegra = Number.isFinite(Number(regras?.pontos_vitoria)) ? Number(regras?.pontos_vitoria) : 10;
    pontosDerrotaRegra = Number.isFinite(Number(regras?.pontos_derrota)) ? Number(regras?.pontos_derrota) : 4;
    partidasRanking = (partidasBrutas ?? []) as PartidaRankingRow[];
  }

  if (selectedEsporteId != null) {
    if (state.tipo === "individual") {
      let q = cityNeedle
        ? supabase
            .from("usuario_eid")
            .select(
              "usuario_id, esporte_id, nota_eid, pontos_ranking, vitorias, derrotas, posicao_rank, profiles!inner(nome, avatar_url, localizacao, genero)",
            )
            .eq("esporte_id", selectedEsporteId)
        : supabase
            .from("usuario_eid")
            .select("usuario_id, esporte_id, nota_eid, pontos_ranking, vitorias, derrotas, posicao_rank, profiles!inner(nome, avatar_url, genero)")
            .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("nota_eid", { ascending: false });
      const { data: raw } = await q;
      const rows = ((raw ?? []) as UsuarioEidRow[]).filter((r) => {
        if (!cityNeedle) return true;
        const p = firstOf(r.profiles);
        const loc = normalizeSearchText(p?.localizacao ?? "");
        return loc.includes(cityNeedle);
      });
      const perfilGeneroByUser = new Map<string, "masculino" | "feminino" | "">();
      for (const r of rows) {
        const p = firstOf(r.profiles);
        perfilGeneroByUser.set(String(r.usuario_id), normalizeGeneroRanking(p?.genero ?? null));
      }
      const pontosByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const winsByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const lossesByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const ensureUserBuckets = (uid: string) => {
        if (!pontosByUserBucket.has(uid)) pontosByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
        if (!winsByUserBucket.has(uid)) winsByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
        if (!lossesByUserBucket.has(uid)) lossesByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
      };
      if (stateComGenero.rank === "match") {
        const ordered = [...partidasRanking].sort((a, b) => {
          const ta = new Date(a.data_resultado ?? a.data_partida ?? a.data_registro ?? 0).getTime();
          const tb = new Date(b.data_resultado ?? b.data_partida ?? b.data_registro ?? 0).getTime();
          return ta - tb;
        });
        for (const p of ordered) {
          const u1 = String(p.jogador1_id ?? "");
          const u2 = String(p.jogador2_id ?? "");
          if (!u1 || !u2) continue;
          const s1 = Number(p.placar_1 ?? p.placar_desafiante ?? NaN);
          const s2 = Number(p.placar_2 ?? p.placar_desafiado ?? NaN);
          if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) continue;
          const winner = s1 > s2 ? u1 : u2;
          const loser = s1 > s2 ? u2 : u1;
          const bucket = matchBucketIndividual(perfilGeneroByUser.get(u1), perfilGeneroByUser.get(u2));
          ensureUserBuckets(winner);
          ensureUserBuckets(loser);
          const wBase = pontosByUserBucket.get(winner)![bucket];
          const lBase = pontosByUserBucket.get(loser)![bucket];
          const upsetCap = Math.max(0, Math.floor(pontosVitoriaRegra * 0.2));
          const upset = lBase > wBase ? upsetCap : 0;
          pontosByUserBucket.get(winner)![bucket] += pontosVitoriaRegra + upset;
          pontosByUserBucket.get(loser)![bucket] += pontosDerrotaRegra;
          winsByUserBucket.get(winner)![bucket] += 1;
          lossesByUserBucket.get(loser)![bucket] += 1;
        }
      }
      rankingAll = rows
        .filter((r) => {
          if (stateComGenero.rank !== "match") return true;
          const p = firstOf(r.profiles);
          const g = normalizeGeneroRanking(p?.genero ?? null);
          if (stateComGenero.genero === "masculino" || stateComGenero.genero === "feminino") return g === stateComGenero.genero;
          if (stateComGenero.genero === "misto" && stateComGenero.rank === "match") {
            const uid = String(r.usuario_id);
            const rec = pontosByUserBucket.get(uid);
            return (rec?.misto ?? 0) > 0;
          }
          return true;
        })
        .map((r) => {
          const p = firstOf(r.profiles);
          const uid = r.usuario_id;
          const pontosGenero =
            stateComGenero.rank === "match"
              ? (pontosByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : Number(r.pontos_ranking ?? 0);
          const vitoriasGenero =
            stateComGenero.rank === "match"
              ? (winsByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : Number(r.vitorias ?? 0);
          const derrotasGenero =
            stateComGenero.rank === "match"
              ? (lossesByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : Number(r.derrotas ?? 0);
          return {
            key: `u-${uid}-${r.esporte_id}`,
            usuarioId: uid,
            nome: p?.nome ?? "Atleta",
            avatarUrl: p?.avatar_url ?? null,
            pontos: pontosGenero,
            notaEid: Number(r.nota_eid ?? 0),
            vitorias: vitoriasGenero,
            derrotas: derrotasGenero,
            posicaoRank: Number.isFinite(Number(r.posicao_rank)) ? Number(r.posicao_rank) : null,
            href: `/perfil/${uid}`,
          };
        });
    } else {
      let q = cityNeedle
        ? supabase
            .from("times")
            .select("id, nome, escudo, localizacao, pontos_ranking, eid_time, esporte_id, tipo, criador_id, genero")
            .eq("esporte_id", selectedEsporteId)
        : supabase
            .from("times")
            .select("id, nome, escudo, pontos_ranking, eid_time, esporte_id, tipo, criador_id, genero")
            .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("eid_time", { ascending: false });
      const { data: raw } = await q;
      const tipoMatches = (r: TimeRow): boolean => {
        const t = String(r.tipo ?? "")
          .trim()
          .toLowerCase();
        if (state.tipo === "dupla") return t === "dupla" || t === "duplas";
        return t !== "dupla" && t !== "duplas";
      };
      const baseRows = ((raw ?? []) as TimeRow[]).filter(tipoMatches);
      const rows = cityNeedle
        ? baseRows.filter((r) => normalizeSearchText(r.localizacao ?? "").includes(cityNeedle))
        : baseRows;
      const teamIds = rows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
      const { data: rosterRows } =
        teamIds.length > 0
          ? await supabase
              .from("membros_time")
              .select("time_id, usuario_id")
              .in("time_id", teamIds)
              .in("status", ["ativo", "aceito", "aprovado"])
          : { data: [] as Array<{ time_id?: number | null; usuario_id?: string | null }> };
      const membersByTeam = new Map<number, Set<string>>();
      const profileIds = new Set<string>();
      for (const r of rows) {
        if (r.criador_id) profileIds.add(String(r.criador_id));
        if (!membersByTeam.has(Number(r.id))) membersByTeam.set(Number(r.id), new Set<string>());
      }
      for (const m of rosterRows ?? []) {
        const tid = Number(m.time_id ?? 0);
        const uid = String(m.usuario_id ?? "");
        if (!tid || !uid) continue;
        if (!membersByTeam.has(tid)) membersByTeam.set(tid, new Set<string>());
        membersByTeam.get(tid)!.add(uid);
        profileIds.add(uid);
      }
      const { data: perfilGenerosRows } =
        profileIds.size > 0
          ? await supabase.from("profiles").select("id, genero").in("id", Array.from(profileIds))
          : { data: [] as Array<{ id?: string | null; genero?: string | null }> };
      const generoByProfile = new Map<string, string | null>();
      for (const p of perfilGenerosRows ?? []) generoByProfile.set(String(p.id ?? ""), p.genero ?? null);
      const generoByTeam = new Map<number, GeneroBucket>();
      for (const t of rows) {
        const ids = new Set<string>([String(t.criador_id ?? "")]);
        for (const mid of membersByTeam.get(Number(t.id)) ?? new Set<string>()) ids.add(mid);
        const generos = Array.from(ids).map((id) => generoByProfile.get(id) ?? null);
        generoByTeam.set(Number(t.id), teamBucketFromMembers(generos));
      }
      const pontosByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const winsByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const lossesByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const ensureTeamBuckets = (tid: number) => {
        if (!pontosByTeamBucket.has(tid)) pontosByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
        if (!winsByTeamBucket.has(tid)) winsByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
        if (!lossesByTeamBucket.has(tid)) lossesByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
      };
      if (stateComGenero.rank === "match") {
        const ordered = [...partidasRanking].sort((a, b) => {
          const ta = new Date(a.data_resultado ?? a.data_partida ?? a.data_registro ?? 0).getTime();
          const tb = new Date(b.data_resultado ?? b.data_partida ?? b.data_registro ?? 0).getTime();
          return ta - tb;
        });
        for (const p of ordered) {
          const t1 = Number(p.time1_id ?? 0);
          const t2 = Number(p.time2_id ?? 0);
          if (!t1 || !t2) continue;
          const s1 = Number(p.placar_1 ?? p.placar_desafiante ?? NaN);
          const s2 = Number(p.placar_2 ?? p.placar_desafiado ?? NaN);
          let winner = 0;
          let loser = 0;
          if (Number(p.vencedor_id ?? 0) === t1 || Number(p.vencedor_id ?? 0) === t2) {
            winner = Number(p.vencedor_id ?? 0);
            loser = winner === t1 ? t2 : t1;
          } else if (Number.isFinite(s1) && Number.isFinite(s2) && s1 !== s2) {
            winner = s1 > s2 ? t1 : t2;
            loser = winner === t1 ? t2 : t1;
          } else {
            continue;
          }
          const g1 = generoByTeam.get(t1) ?? "misto";
          const g2 = generoByTeam.get(t2) ?? "misto";
          const bucket = matchBucketFormacoes(g1, g2);
          ensureTeamBuckets(winner);
          ensureTeamBuckets(loser);
          const wBase = pontosByTeamBucket.get(winner)![bucket];
          const lBase = pontosByTeamBucket.get(loser)![bucket];
          const upsetCap = Math.max(0, Math.floor(pontosVitoriaRegra * 0.2));
          const upset = lBase > wBase ? upsetCap : 0;
          pontosByTeamBucket.get(winner)![bucket] += pontosVitoriaRegra + upset;
          pontosByTeamBucket.get(loser)![bucket] += pontosDerrotaRegra;
          winsByTeamBucket.get(winner)![bucket] += 1;
          lossesByTeamBucket.get(loser)![bucket] += 1;
        }
      }
      rankingAll = rows
        .filter((r) => {
          if (stateComGenero.rank !== "match") return true;
          const teamGenero = generoByTeam.get(Number(r.id)) ?? "misto";
          if (stateComGenero.genero === "misto") return teamGenero === "misto";
          if (stateComGenero.genero === "masculino" || stateComGenero.genero === "feminino")
            return teamGenero === stateComGenero.genero;
          return true;
        })
        .map((r) => ({
          key: `t-${r.id}-${r.esporte_id ?? 0}`,
          timeId: r.id,
          nome: r.nome?.trim() || "Equipe",
          avatarUrl: r.escudo ?? null,
          pontos:
            stateComGenero.rank === "match"
              ? (pontosByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : Number(r.pontos_ranking ?? 0),
          notaEid: Number(r.eid_time ?? 0),
          vitorias:
            stateComGenero.rank === "match"
              ? (winsByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : null,
          derrotas:
            stateComGenero.rank === "match"
              ? (lossesByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
              : null,
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
        `and(data_resultado.gte.${monthStartIso},data_resultado.lt.${nextMonthStartIso}),and(data_partida.gte.${monthStartIso},data_partida.lt.${nextMonthStartIso}),and(data_registro.gte.${monthStartIso},data_registro.lt.${nextMonthStartIso})`,
      )
      .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"]);

    const rows = ((partidasBrutas ?? []) as PartidaPeriodoRow[]).filter((p) =>
      timestampPartidaNoMesAtual(p, monthStartMs, nextMonthStartMs),
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

  rankingAll.sort((a, b) => {
    const metricA = stateComGenero.rank === "eid" ? a.notaEid : a.pontos;
    const metricB = stateComGenero.rank === "eid" ? b.notaEid : b.pontos;
    if (metricB !== metricA) return metricB - metricA;
    return b.notaEid - a.notaEid;
  });

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

  const esporteNomeAtual =
    selectedEsporteId != null ? todosEsportes.find((e) => e.id === selectedEsporteId)?.nome ?? null : null;
  const rankBadgeLabel = state.rank === "eid" ? "EID" : "Desafio";
  const periodoBadgeLabel = state.periodo === "mes" ? "Mês" : "Ano";

  return (
    <>
      {state.page === 1 ? (
        <section className="mt-4 md:mt-6">
          <RankingPodium
            second={podiumSecond}
            first={podiumFirst}
            third={podiumThird}
            rankKind={state.rank}
            genderToggle={
              state.rank === "match" ? (
                <RankingGenderToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />
              ) : undefined
            }
            rankToggle={<RankingRankToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />}
            periodToggle={<RankingPeriodToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />}
          />
        </section>
      ) : null}

      {showViewerCard && viewerRank !== null ? (
        <div className="mt-3 md:mt-4">
          <ViewerRankCard rank={viewerRank} />
        </div>
      ) : null}

      {rankingAll.length === 0 ? (
        <p className="eid-ranking-empty mt-4 rounded-xl border border-transparent bg-eid-surface/40 p-6 text-center text-sm text-eid-text-secondary shadow-none">
          Nenhum resultado para estes filtros.
        </p>
      ) : null}

      {rankingAll.length > 0 ? (
        <>
          <section className="relative z-[1] mt-4 md:mt-6">
            <div className={rankingCardShellClass}>
              <div className={rankingCardHeadWrapClass}>
                <h2 className={rankingSectionTitleClass}>Classificação</h2>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                  {esporteNomeAtual ? <span className={rankingBadgeActionClass}>{esporteNomeAtual}</span> : null}
                  <span className={rankingBadgePrimaryClass}>
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
                        vitorias={row.vitorias ?? null}
                        derrotas={row.derrotas ?? null}
                        rankDelta={row.posicaoRank != null ? row.posicaoRank - rank : null}
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
            <div className="mt-0">
              <RankingLoadMoreButton
                href={rankingHref({ page: state.page + 1 }, stateComGenero, esportePrincipalId)}
                className="eid-ranking-cta inline-flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-transparent px-5 text-[11px] font-black uppercase tracking-[0.02em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] transition-all duration-200 ease-out motion-safe:transform-gpu hover:bg-eid-primary-500/10 active:scale-[0.995]"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
