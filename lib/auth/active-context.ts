export const ACTIVE_CONTEXT_COOKIE = "eid-active-context";

export const ACTIVE_CONTEXTS = ["atleta", "professor", "organizador", "espaco"] as const;

export type ActiveAppContext = (typeof ACTIVE_CONTEXTS)[number];

export function isActiveAppContext(value: string | null | undefined): value is ActiveAppContext {
  return (
    value === "atleta" ||
    value === "professor" ||
    value === "organizador" ||
    value === "espaco"
  );
}

export function hasAtletaContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("atleta");
}

export function hasProfessorContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("professor");
}

export function hasOrganizadorContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("organizador");
}

export function hasEspacoContextCapability(papeis: readonly string[]): boolean {
  return papeis.includes("espaco");
}

export function listAvailableAppContexts(papeis: readonly string[]): ActiveAppContext[] {
  const contexts: ActiveAppContext[] = [];
  if (hasAtletaContextCapability(papeis)) contexts.push("atleta");
  if (hasProfessorContextCapability(papeis)) contexts.push("professor");
  if (hasOrganizadorContextCapability(papeis)) contexts.push("organizador");
  if (hasEspacoContextCapability(papeis)) contexts.push("espaco");
  return contexts.length > 0 ? contexts : ["atleta"];
}

export function resolveActiveAppContext(
  requested: string | null | undefined,
  papeis: readonly string[]
): ActiveAppContext {
  const available = listAvailableAppContexts(papeis);
  if (isActiveAppContext(requested) && available.includes(requested)) return requested;
  return available[0] ?? "atleta";
}

export function getContextHomeHref(context: ActiveAppContext): string {
  if (context === "professor") return "/professor";
  if (context === "organizador") return "/organizador";
  if (context === "espaco") return "/espaco";
  return "/dashboard";
}
