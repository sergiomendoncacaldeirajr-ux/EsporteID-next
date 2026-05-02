import type { SupabaseClient } from "@supabase/supabase-js";

/** Líder pode excluir o perfil da formação: só ele no elenco (headcount 1) e sem pendências de convite/candidatura. */
export async function podeExcluirFormacaoComoLider(
  supabase: SupabaseClient,
  timeId: number,
  viewerId: string
): Promise<boolean> {
  const { data: t } = await supabase.from("times").select("criador_id").eq("id", timeId).maybeSingle();
  if (!t?.criador_id || t.criador_id !== viewerId) return false;

  const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: timeId });
  if (headErr || headRaw == null || Number(headRaw) !== 1) return false;

  const { count: nConv } = await supabase
    .from("time_convites")
    .select("id", { count: "exact", head: true })
    .eq("time_id", timeId)
    .eq("status", "pendente");
  const { count: nCand } = await supabase
    .from("time_candidaturas")
    .select("id", { count: "exact", head: true })
    .eq("time_id", timeId)
    .eq("status", "pendente");

  return (nConv ?? 0) === 0 && (nCand ?? 0) === 0;
}
