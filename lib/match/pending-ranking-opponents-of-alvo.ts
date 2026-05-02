import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IDs das formações (times/duplas) que estão com `matches` de ranking **Pendente**
 * em relação ao `alvoTimeId` (o outro lado do confronto).
 */
export async function fetchPendingRankingOpponentTimeIdsForAlvo(
  supabase: SupabaseClient,
  alvoTimeId: number,
  esporteId: number
): Promise<Set<number>> {
  if (!Number.isFinite(alvoTimeId) || alvoTimeId < 1 || !Number.isFinite(esporteId) || esporteId < 1) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("matches")
    .select("desafiante_time_id, adversario_time_id")
    .eq("status", "Pendente")
    .eq("finalidade", "ranking")
    .eq("esporte_id", esporteId)
    .in("modalidade_confronto", ["dupla", "time"])
    .or(`desafiante_time_id.eq.${alvoTimeId},adversario_time_id.eq.${alvoTimeId}`);

  if (error || !data?.length) return new Set();

  const out = new Set<number>();
  for (const m of data) {
    const a = Number((m as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const b = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (a === alvoTimeId && Number.isFinite(b) && b > 0) out.add(b);
    if (b === alvoTimeId && Number.isFinite(a) && a > 0) out.add(a);
  }
  return out;
}

export function filterFormacoesSemParPendenteComAlvo<T extends { id: number }>(
  formacoes: T[],
  alvoTimeId: number,
  pendentesComAlvo: Set<number>
): T[] {
  return formacoes.filter((f) => {
    const fid = Number(f.id);
    if (!Number.isFinite(fid) || fid < 1) return false;
    if (fid === alvoTimeId) return false;
    return !pendentesComAlvo.has(fid);
  });
}
