import type { SupabaseClient } from "@supabase/supabase-js";

export type SystemFeatureKey =
  | "marketplace"
  | "locais"
  | "torneios"
  | "professores"
  | "organizador_torneios";

export type SystemFeatureMode = "ativo" | "em_breve" | "desenvolvimento" | "teste";

type FeatureEntry = {
  mode: SystemFeatureMode;
  testers: string[];
};

export const SYSTEM_FEATURE_LABEL: Record<SystemFeatureKey, string> = {
  marketplace: "MarketPlace",
  locais: "Locais",
  torneios: "Torneios",
  professores: "Professores",
  organizador_torneios: "Organizador de torneios",
};

const DEFAULT_MODE: Record<SystemFeatureKey, SystemFeatureMode> = {
  marketplace: "desenvolvimento",
  locais: "desenvolvimento",
  torneios: "desenvolvimento",
  professores: "desenvolvimento",
  organizador_torneios: "desenvolvimento",
};

function normalizeMode(v: unknown): SystemFeatureMode {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ativo") return "ativo";
  if (s === "em_breve") return "em_breve";
  if (s === "teste") return "teste";
  return "desenvolvimento";
}

function normalizeTesters(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x ?? "").trim()).filter(Boolean))];
}

function defaultEntry(key: SystemFeatureKey): FeatureEntry {
  return { mode: DEFAULT_MODE[key], testers: [] };
}

export async function getSystemFeatureConfig(
  supabase: SupabaseClient
): Promise<Record<SystemFeatureKey, FeatureEntry>> {
  const { data } = await supabase.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
  const raw = data?.value_json;
  const base: Record<SystemFeatureKey, FeatureEntry> = {
    marketplace: defaultEntry("marketplace"),
    locais: defaultEntry("locais"),
    torneios: defaultEntry("torneios"),
    professores: defaultEntry("professores"),
    organizador_torneios: defaultEntry("organizador_torneios"),
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const features = (raw as { features?: Record<string, unknown> }).features;
  if (!features || typeof features !== "object") return base;
  for (const key of Object.keys(base) as SystemFeatureKey[]) {
    const row = (features as Record<string, unknown>)[key];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const typed = row as { mode?: unknown; testers?: unknown };
    base[key] = {
      mode: normalizeMode(typed.mode),
      testers: normalizeTesters(typed.testers),
    };
  }
  return base;
}

export function canAccessSystemFeature(
  cfg: Record<SystemFeatureKey, FeatureEntry>,
  feature: SystemFeatureKey,
  userId: string | null | undefined,
  isPlatformAdmin = false
): boolean {
  if (isPlatformAdmin) return true;
  const row = cfg[feature] ?? defaultEntry(feature);
  if (row.mode === "ativo") return true;
  if (row.mode === "teste") return Boolean(userId) && row.testers.includes(String(userId));
  return false;
}

