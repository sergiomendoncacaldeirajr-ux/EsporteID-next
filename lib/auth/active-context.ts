export const ACTIVE_CONTEXT_COOKIE = "eid-active-context";

export const ACTIVE_CONTEXTS = ["atleta", "organizador"] as const;

export type ActiveAppContext = (typeof ACTIVE_CONTEXTS)[number];

export function isActiveAppContext(value: string | null | undefined): value is ActiveAppContext {
  return value === "atleta" || value === "organizador";
}

export function hasAtletaContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("atleta") || papeis.includes("professor");
}

export function hasOrganizadorContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("organizador");
}

export function listAvailableAppContexts(papeis: readonly string[]): ActiveAppContext[] {
  const contexts: ActiveAppContext[] = [];
  if (hasOrganizadorContextCapability(papeis)) contexts.push("organizador");
  if (hasAtletaContextCapability(papeis)) contexts.push("atleta");
  return contexts.length > 0 ? contexts : ["atleta"];
}

export function resolveActiveAppContext(
  requested: string | null | undefined,
  papeis: readonly string[]
): ActiveAppContext {
  const available = listAvailableAppContexts(papeis);
  if (isActiveAppContext(requested) && available.includes(requested)) return requested;
  if (available.includes("organizador")) return "organizador";
  return "atleta";
}

export function getContextHomeHref(context: ActiveAppContext): string {
  return context === "organizador" ? "/organizador" : "/dashboard";
}
