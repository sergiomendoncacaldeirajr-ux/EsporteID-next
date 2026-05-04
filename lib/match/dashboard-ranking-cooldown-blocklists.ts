import type { SupabaseClient } from "@supabase/supabase-js";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import type { MatchRadarCard, MatchRadarFinalidade } from "@/lib/match/radar-snapshot";

function norm(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

/** Partida de ranking válida cuja data cai dentro da janela de carência (mesma regra do radar / desafio). */
function partidaDentroRankingCooldown(p: Record<string, unknown>, cutoffMs: number): boolean {
  const status = norm((p as { status?: string | null }).status);
  const statusRanking = norm((p as { status_ranking?: string | null }).status_ranking);
  const valid =
    statusRanking === "validado" ||
    ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
  if (!valid) return false;
  const dtRaw =
    (p as { data_resultado?: string | null }).data_resultado ??
    (p as { data_partida?: string | null }).data_partida ??
    (p as { data_registro?: string | null }).data_registro ??
    null;
  if (!dtRaw) return false;
  const ts = new Date(dtRaw).getTime();
  return Number.isFinite(ts) && ts >= cutoffMs;
}

/**
 * Atletas e times que não devem aparecer como sugestão de confronto no dashboard
 * (carência de ranking no esporte principal), espelhando `lib/match/radar-snapshot.ts`.
 */
export async function fetchDashboardRankingCooldownBlocklists(
  supabase: SupabaseClient,
  opts: {
    viewerId: string;
    esporteId: number | null;
    viewerTeamIds: number[];
  }
): Promise<{ blockedUserIds: Set<string>; blockedTeamIds: Set<number> }> {
  const blockedUserIds = new Set<string>();
  const blockedTeamIds = new Set<number>();
  const { viewerId, esporteId, viewerTeamIds } = opts;

  if (esporteId == null || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) {
    return { blockedUserIds, blockedTeamIds };
  }

  const eid = Number(esporteId);
  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
  const rankingCooldownCutoffMs = cutoff.getTime();

  const { data: partRows } = await supabase
    .from("partidas")
    .select(
      "jogador1_id, jogador2_id, time1_id, time2_id, status, status_ranking, data_resultado, data_registro, data_partida"
    )
    .eq("esporte_id", eid)
    .is("torneio_id", null)
    .or(`jogador1_id.eq.${viewerId},jogador2_id.eq.${viewerId}`)
    .order("id", { ascending: false })
    .limit(300);

  for (const p of partRows ?? []) {
    if (!partidaDentroRankingCooldown(p as Record<string, unknown>, rankingCooldownCutoffMs)) continue;
    const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "");
    const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "");
    const t1 = Number((p as { time1_id?: number | null }).time1_id ?? 0);
    const t2 = Number((p as { time2_id?: number | null }).time2_id ?? 0);
    if (j1 === viewerId && j2) blockedUserIds.add(j2);
    else if (j2 === viewerId && j1) blockedUserIds.add(j1);
    if (j1 === viewerId && Number.isFinite(t2) && t2 > 0) blockedTeamIds.add(t2);
    if (j2 === viewerId && Number.isFinite(t1) && t1 > 0) blockedTeamIds.add(t1);
  }

  const mine = new Set(viewerTeamIds.filter((n) => Number.isFinite(n) && n > 0));
  if (mine.size > 0) {
    const idList = [...mine].filter((n) => n > 0).slice(0, 80).join(",");
    if (idList.length > 0) {
      const { data: partTeamRows } = await supabase
        .from("partidas")
        .select("time1_id, time2_id, status, status_ranking, data_resultado, data_registro, data_partida")
        .eq("esporte_id", eid)
        .is("torneio_id", null)
        .or(`time1_id.in.(${idList}),time2_id.in.(${idList})`)
        .order("id", { ascending: false })
        .limit(300);
      for (const p of partTeamRows ?? []) {
        if (!partidaDentroRankingCooldown(p as Record<string, unknown>, rankingCooldownCutoffMs)) continue;
        const pt1 = Number((p as { time1_id?: number | null }).time1_id ?? 0);
        const pt2 = Number((p as { time2_id?: number | null }).time2_id ?? 0);
        if (mine.has(pt1) && Number.isFinite(pt2) && pt2 > 0) blockedTeamIds.add(pt2);
        if (mine.has(pt2) && Number.isFinite(pt1) && pt1 > 0) blockedTeamIds.add(pt1);
      }
    }
  }

  return { blockedUserIds, blockedTeamIds };
}

/** IDs de times em que o usuário é criador ou membro ativo (carência coletiva no radar). */
export async function fetchViewerAllTeamIds(supabase: SupabaseClient, viewerId: string): Promise<number[]> {
  const [{ data: criados }, { data: membro }] = await Promise.all([
    supabase.from("times").select("id").eq("criador_id", viewerId),
    supabase
      .from("membros_time")
      .select("time_id")
      .eq("usuario_id", viewerId)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const ids = new Set<number>();
  for (const r of criados ?? []) {
    const id = Number((r as { id?: number | null }).id ?? 0);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  for (const r of membro ?? []) {
    const id = Number((r as { time_id?: number | null }).time_id ?? 0);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

/**
 * Remove cartões que só entraram pelo merge ranking+amistoso ("todas" / tela cheia) mas estão em carência de ranking
 * naquele esporte — alinha à aba ranking do radar e ao desafio.
 */
export async function filterMatchRadarCardsByRankingCooldown(
  supabase: SupabaseClient,
  opts: {
    viewerId: string;
    viewerTeamIds: number[];
    finalidade: MatchRadarFinalidade;
    cards: MatchRadarCard[];
  }
): Promise<MatchRadarCard[]> {
  const { viewerId, viewerTeamIds, finalidade, cards } = opts;
  if (finalidade !== "ranking" || cards.length === 0) return cards;

  const uniqueEids = [
    ...new Set(cards.map((c) => Number(c.esporteId ?? 0)).filter((n) => Number.isFinite(n) && n > 0)),
  ];
  const blockPerEid = new Map<number, { users: Set<string>; teams: Set<number> }>();

  await Promise.all(
    uniqueEids.map(async (eid) => {
      const { blockedUserIds, blockedTeamIds } = await fetchDashboardRankingCooldownBlocklists(supabase, {
        viewerId,
        esporteId: eid,
        viewerTeamIds,
      });
      blockPerEid.set(eid, { users: blockedUserIds, teams: blockedTeamIds });
    })
  );

  return cards.filter((c) => {
    const eid = Number(c.esporteId ?? 0);
    const bl = blockPerEid.get(eid);
    if (!bl) return true;
    if (c.modalidade === "individual") return !bl.users.has(String(c.id));
    const tid = Number(c.id);
    return !(Number.isFinite(tid) && tid > 0 && bl.teams.has(tid));
  });
}
