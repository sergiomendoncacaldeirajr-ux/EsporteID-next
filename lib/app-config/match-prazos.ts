import type { SupabaseClient } from "@supabase/supabase-js";

function readHoras(vj: unknown, def: number, max: number): number {
  if (vj && typeof vj === "object" && !Array.isArray(vj) && "horas" in vj) {
    const n = Number((vj as { horas?: unknown }).horas);
    if (Number.isFinite(n) && n >= 1) return Math.min(max, Math.floor(n));
  }
  return def;
}

/** Janela para marcar data/local após aceite do desafio. Default 72 h, max 720 h. */
export async function getMatchAgendamentoJanelaHoras(db: SupabaseClient): Promise<number> {
  const { data } = await db.from("app_config").select("value_json").eq("key", "match_agendamento_janela_horas").maybeSingle();
  return readHoras(data?.value_json, 72, 720);
}

/** Prazo para o oponente aceitar a data/local proposta. Default 24 h, max 168 h. */
export async function getMatchAgendamentoAceiteHoras(db: SupabaseClient): Promise<number> {
  const { data } = await db.from("app_config").select("value_json").eq("key", "match_agendamento_aceite_horas").maybeSingle();
  return readHoras(data?.value_json, 24, 168);
}

/** Prazo de resposta ao pedido de cancelamento. Default 72 h, max 336 h. */
export async function getMatchCancelamentoRespostaHoras(db: SupabaseClient): Promise<number> {
  const { data } = await db.from("app_config").select("value_json").eq("key", "match_cancelamento_resposta_horas").maybeSingle();
  return readHoras(data?.value_json, 72, 336);
}
