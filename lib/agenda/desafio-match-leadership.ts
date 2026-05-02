import type { SupabaseClient } from "@supabase/supabase-js";

export type DesafioMatchLeadershipInput = {
  usuario_id?: string | null;
  adversario_id?: string | null;
  desafiante_time_id?: number | null;
  adversario_time_id?: number | null;
  modalidade_confronto?: string | null;
};

function modalidadeColetivaRank(mod: string | null | undefined): boolean {
  const m = String(mod ?? "")
    .trim()
    .toLowerCase();
  return m === "dupla" || m === "time";
}

/** Líder de agenda/placar = jogador do confronto individual ou líder atual da formação (`times.criador_id`, atualizado na transferência). */
export function userIsDesafioAgendaLeaderFromMap(
  userId: string,
  m: DesafioMatchLeadershipInput,
  criadorPorTimeId: ReadonlyMap<number, string>
): boolean {
  const dti = Number(m.desafiante_time_id ?? 0);
  const ati = Number(m.adversario_time_id ?? 0);
  const teamIds = [dti, ati].filter((n) => Number.isFinite(n) && n > 0);
  const coletivo =
    teamIds.length > 0 || modalidadeColetivaRank(m.modalidade_confronto);

  if (!coletivo) {
    return userId === String(m.usuario_id ?? "").trim() || userId === String(m.adversario_id ?? "").trim();
  }
  if (!teamIds.length) {
    return userId === String(m.usuario_id ?? "").trim() || userId === String(m.adversario_id ?? "").trim();
  }
  for (const tid of teamIds) {
    if (criadorPorTimeId.get(tid) === userId) return true;
  }
  return false;
}

export async function fetchCriadoresPorTimeIds(
  supabase: SupabaseClient,
  timeIds: Array<number | null | undefined>
): Promise<Map<number, string>> {
  const ids = [
    ...new Set(
      timeIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (!ids.length) return new Map();
  const { data } = await supabase.from("times").select("id, criador_id").in("id", ids);
  const m = new Map<number, string>();
  for (const r of data ?? []) {
    const id = Number((r as { id: number }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const c = String((r as { criador_id?: string | null }).criador_id ?? "").trim();
    if (c) m.set(id, c);
  }
  return m;
}

/** Partida de ranking com fluxo encerrado: membros não precisam mais ver o card de “desafio aceito”. */
export function partidaRankingEncerradaParaResumo(meta: {
  status: string | null;
  status_ranking: string | null;
} | null | undefined): boolean {
  if (!meta) return false;
  const s = String(meta.status ?? "")
    .trim()
    .toLowerCase();
  const r = String(meta.status_ranking ?? "")
    .trim()
    .toLowerCase();
  if (["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(s)) return true;
  if (r === "validado" || r === "validada") return true;
  return false;
}
