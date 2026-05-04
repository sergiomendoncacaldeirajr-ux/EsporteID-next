import { cache } from "react";
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

export const ALL_SYSTEM_FEATURE_KEYS: SystemFeatureKey[] = [
  "marketplace",
  "locais",
  "torneios",
  "professores",
  "organizador_torneios",
];

function isSystemFeatureKey(s: string): s is SystemFeatureKey {
  return (ALL_SYSTEM_FEATURE_KEYS as string[]).includes(s);
}

/** `null` no banco = sem lista (todos os módulos elegíveis ao sandbox). Array vazio = nenhum módulo pela lista. */
export function parsePerfilModoTesteModulosJson(raw: unknown): SystemFeatureKey[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: SystemFeatureKey[] = [];
  for (const x of raw) {
    const s = String(x ?? "").trim();
    if (isSystemFeatureKey(s)) out.push(s);
  }
  return out;
}

export type ViewerSandboxFlags = {
  perfilModoTeste: boolean;
  perfilModoTesteModulos: SystemFeatureKey[] | null;
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

/** Sandbox: `perfil_modo_teste` + lista opcional de módulos (`perfil_modo_teste_modulos`). */
export const getViewerSandboxFeatureFlags = cache(async (supabase: SupabaseClient, userId: string): Promise<ViewerSandboxFlags> => {
  const { data } = await supabase
    .from("profiles")
    .select("perfil_modo_teste, perfil_modo_teste_modulos")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { perfil_modo_teste?: boolean | null; perfil_modo_teste_modulos?: unknown } | null;
  return {
    perfilModoTeste: row?.perfil_modo_teste === true,
    perfilModoTesteModulos: parsePerfilModoTesteModulosJson(row?.perfil_modo_teste_modulos ?? null),
  };
});

export function canAccessSystemFeature(
  cfg: Record<SystemFeatureKey, FeatureEntry>,
  feature: SystemFeatureKey,
  userId: string | null | undefined,
  isPlatformAdmin = false,
  perfilModoTeste = false,
  perfilModoTesteModulos: SystemFeatureKey[] | null = null
): boolean {
  if (isPlatformAdmin) return true;
  const row = cfg[feature] ?? defaultEntry(feature);
  if (row.mode === "ativo") return true;
  if (perfilModoTeste) {
    if (row.mode === "em_breve") return false;
    if (perfilModoTesteModulos != null) {
      if (perfilModoTesteModulos.length === 0) return false;
      if (!perfilModoTesteModulos.includes(feature)) return false;
    }
    return true;
  }
  if (row.mode === "teste") return Boolean(userId) && row.testers.includes(String(userId));
  return false;
}

