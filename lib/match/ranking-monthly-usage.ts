import type { SupabaseClient } from "@supabase/supabase-js";

export type RankingMonthlyUsage = {
  active: number;
  finalized: number;
  used: number;
};

type ModalidadeRanking = "individual" | "dupla" | "time";
type AnyRow = Record<string, unknown>;

const FINAL_STATUSES = new Set(["concluida", "concluída", "concluido", "concluído", "finalizada", "finalizado", "encerrada", "encerrado", "validada", "validado"]);
const CANCEL_STATUSES = new Set(["cancelada", "cancelado", "cancelled", "canceled", "recusada", "recusado", "rejeitada", "rejeitado"]);

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function matchModalidade(row: AnyRow): ModalidadeRanking {
  const raw = norm(row.modalidade_confronto ?? row.tipo ?? row.modalidade);
  if (raw === "dupla") return "dupla";
  if (raw === "time" || raw === "equipe") return "time";
  return "individual";
}

function partidaModalidade(row: AnyRow): ModalidadeRanking {
  const raw = norm(row.modalidade ?? row.modalidade_confronto);
  if (raw === "dupla") return "dupla";
  if (raw === "time" || raw === "equipe") return "time";
  return "individual";
}

function currentMonthRangeIso(): { monthStart: string; nextMonthStart: string } {
  const now = new Date();
  return {
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString(),
    nextMonthStart: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString(),
  };
}

function finalDateIso(row: AnyRow): string | null {
  const raw = row.data_resultado ?? row.data_validacao ?? row.data_registro ?? row.data_partida ?? null;
  if (!raw) return null;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isFinalizedPartida(row: AnyRow): boolean {
  return norm(row.status_ranking) === "validado" || FINAL_STATUSES.has(norm(row.status));
}

function isCancelled(row: AnyRow): boolean {
  return CANCEL_STATUSES.has(norm(row.status)) || CANCEL_STATUSES.has(norm(row.status_ranking));
}

function isActiveMatch(row: AnyRow): boolean {
  if (norm(row.finalidade) !== "ranking") return false;
  if (isCancelled(row)) return false;
  return !FINAL_STATUSES.has(norm(row.status));
}

function activeKey(row: AnyRow): string {
  const matchId = numberValue(row.match_id);
  if (matchId > 0) return `m:${matchId}`;
  return `p:${numberValue(row.id)}`;
}

function countRows(rows: AnyRow[], modalidade: ModalidadeRanking, monthStart: string, nextMonthStart: string): RankingMonthlyUsage {
  const activeKeys = new Set<string>();
  let finalized = 0;

  for (const row of rows) {
    if (partidaModalidade(row) !== modalidade) continue;
    if (isCancelled(row)) continue;
    if (isFinalizedPartida(row)) {
      const iso = finalDateIso(row);
      if (iso && iso >= monthStart && iso < nextMonthStart) finalized += 1;
      continue;
    }
    activeKeys.add(activeKey(row));
  }

  return { active: activeKeys.size, finalized, used: activeKeys.size + finalized };
}

async function activeMatchesIndividual(supabase: SupabaseClient, userId: string, esporteId: number): Promise<Set<string>> {
  const { data } = await supabase
    .from("matches")
    .select("id, finalidade, status, modalidade_confronto, tipo, usuario_id, adversario_id")
    .eq("esporte_id", esporteId)
    .eq("finalidade", "ranking")
    .or(`usuario_id.eq.${userId},adversario_id.eq.${userId}`)
    .limit(600);

  const keys = new Set<string>();
  for (const row of (data ?? []) as AnyRow[]) {
    if (matchModalidade(row) !== "individual") continue;
    if (!isActiveMatch(row)) continue;
    keys.add(`m:${numberValue(row.id)}`);
  }
  return keys;
}

async function activeMatchesPorTime(supabase: SupabaseClient, timeId: number, esporteId: number, modalidade: "dupla" | "time"): Promise<Set<string>> {
  const { data } = await supabase
    .from("matches")
    .select("id, finalidade, status, modalidade_confronto, tipo, desafiante_time_id, adversario_time_id")
    .eq("esporte_id", esporteId)
    .eq("finalidade", "ranking")
    .or(`desafiante_time_id.eq.${timeId},adversario_time_id.eq.${timeId}`)
    .limit(600);

  const keys = new Set<string>();
  for (const row of (data ?? []) as AnyRow[]) {
    if (matchModalidade(row) !== modalidade) continue;
    if (!isActiveMatch(row)) continue;
    keys.add(`m:${numberValue(row.id)}`);
  }
  return keys;
}

export async function countRankingMonthlyUsageIndividual(supabase: SupabaseClient, userId: string, esporteId: number): Promise<RankingMonthlyUsage> {
  const { monthStart, nextMonthStart } = currentMonthRangeIso();
  const [{ data: partidas }, matchKeys] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, match_id, modalidade, status, status_ranking, data_resultado, data_validacao, data_registro, data_partida, jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, time1_id, time2_id")
      .eq("esporte_id", esporteId)
      .is("torneio_id", null)
      .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId},desafiante_id.eq.${userId},desafiado_id.eq.${userId}`)
      .limit(600),
    activeMatchesIndividual(supabase, userId, esporteId),
  ]);

  const rows = ((partidas ?? []) as AnyRow[]).filter((row) =>
    [row.jogador1_id, row.jogador2_id, row.usuario_id, row.desafiante_id, row.desafiado_id].some((value) => stringValue(value) === userId),
  );
  const usage = countRows(rows, "individual", monthStart, nextMonthStart);
  for (const row of rows) {
    if (isFinalizedPartida(row) || isCancelled(row) || partidaModalidade(row) !== "individual") continue;
    const matchId = numberValue(row.match_id);
    if (matchId > 0) matchKeys.delete(`m:${matchId}`);
  }

  return { active: usage.active + matchKeys.size, finalized: usage.finalized, used: usage.used + matchKeys.size };
}

export async function countRankingMonthlyUsagePorTime(
  supabase: SupabaseClient,
  timeId: number,
  esporteId: number,
  modalidade: "dupla" | "time",
): Promise<RankingMonthlyUsage> {
  const { monthStart, nextMonthStart } = currentMonthRangeIso();
  const [{ data: partidas }, matchKeys] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, match_id, modalidade, status, status_ranking, data_resultado, data_validacao, data_registro, data_partida, time1_id, time2_id")
      .eq("esporte_id", esporteId)
      .is("torneio_id", null)
      .or(`time1_id.eq.${timeId},time2_id.eq.${timeId}`)
      .limit(600),
    activeMatchesPorTime(supabase, timeId, esporteId, modalidade),
  ]);

  const rows = ((partidas ?? []) as AnyRow[]).filter((row) => numberValue(row.time1_id) === timeId || numberValue(row.time2_id) === timeId);
  const usage = countRows(rows, modalidade, monthStart, nextMonthStart);
  for (const row of rows) {
    if (isFinalizedPartida(row) || isCancelled(row) || partidaModalidade(row) !== modalidade) continue;
    const matchId = numberValue(row.match_id);
    if (matchId > 0) matchKeys.delete(`m:${matchId}`);
  }

  return { active: usage.active + matchKeys.size, finalized: usage.finalized, used: usage.used + matchKeys.size };
}

export async function countRankingConfrontosNoMesIndividual(supabase: SupabaseClient, userId: string, esporteId: number): Promise<number> {
  return (await countRankingMonthlyUsageIndividual(supabase, userId, esporteId)).used;
}

export async function countRankingConfrontosNoMesPorTime(
  supabase: SupabaseClient,
  timeId: number,
  esporteId: number,
  modalidade: "dupla" | "time" = "dupla",
): Promise<number> {
  return (await countRankingMonthlyUsagePorTime(supabase, timeId, esporteId, modalidade)).used;
}
