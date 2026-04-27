import type { SupabaseClient } from "@supabase/supabase-js";

/** Limite mensal de confrontos de ranking por usuário em cada esporte (admin configurável). */
export async function getMatchRankMonthlyLimitPerSport(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("app_config").select("value_json").eq("key", "match_rank_monthly_limit_per_sport").maybeSingle();
  const raw = data?.value_json;
  if (raw == null) return 4;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "limite" in raw) {
    const n = Number((raw as { limite?: unknown }).limite);
    if (Number.isFinite(n) && n >= 1) return Math.min(60, Math.floor(n));
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.min(60, Math.max(1, Math.floor(raw)));
  return 4;
}

