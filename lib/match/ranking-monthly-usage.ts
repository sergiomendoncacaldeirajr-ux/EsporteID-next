import type { SupabaseClient } from "@supabase/supabase-js";

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function partidaModalidadeRank(row: unknown): string {
  const raw = norm((row as { modalidade?: string | null; modalidade_confronto?: string | null }).modalidade ?? (row as { modalidade_confronto?: string | null }).modalidade_confronto);
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

export async function countRankingConfrontosNoMesIndividual(
  supabase: SupabaseClient,
  userId: string,
  esporteId: number,
): Promise<number> {
  const { monthStart, nextMonthStart } = currentMonthRangeIso();
  const { data } = await supabase
    .from("partidas")
    .select("modalidade, status, status_ranking, data_resultado, data_registro, data_partida, jogador1_id, jogador2_id")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
    .limit(400);

  let count = 0;
  for (const p of data ?? []) {
    if (partidaModalidadeRank(p) !== "individual") continue;
    const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "").trim();
    const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "").trim();
    if (j1 !== userId && j2 !== userId) continue;
    const status = norm((p as { status?: string | null }).status);
    const ranking = norm((p as { status_ranking?: string | null }).status_ranking);
    const valido =
      ranking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valido) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_registro?: string | null }).data_registro ??
      (p as { data_partida?: string | null }).data_partida ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).toISOString();
    if (ts >= monthStart && ts < nextMonthStart) count += 1;
  }
  return count;
}
