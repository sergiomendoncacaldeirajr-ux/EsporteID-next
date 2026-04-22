import type { SupabaseClient } from "@supabase/supabase-js";

/** Meses de carência entre confrontos de ranking válidos (mesmo par + esporte), configurável no admin. */
export async function getMatchRankCooldownMeses(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("app_config").select("value_json").eq("key", "match_rank_cooldown_meses").maybeSingle();
  const raw = data?.value_json;
  if (raw == null) return 12;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "meses" in raw) {
    const n = Number((raw as { meses?: unknown }).meses);
    if (Number.isFinite(n) && n >= 1) return Math.min(120, Math.floor(n));
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.min(120, Math.max(1, Math.floor(raw)));
  return 12;
}
