export const PAPEIS_VALIDOS = ["atleta", "professor", "organizador", "espaco"] as const;

export type Papel = (typeof PAPEIS_VALIDOS)[number];

export type PapelRow = {
  papel: string | null;
  detalhes_json?: unknown;
};

export function isPapel(value: string): value is Papel {
  return (PAPEIS_VALIDOS as readonly string[]).includes(value);
}

export function listarPapeis(rows: PapelRow[] | null | undefined): Papel[] {
  const unique = new Set<Papel>();
  for (const row of rows ?? []) {
    const papel = String(row.papel ?? "").trim().toLowerCase();
    if (isPapel(papel)) unique.add(papel);
  }
  return [...unique];
}

export function normalizarPapeisContaPrincipal(papeis: readonly string[]): Papel[] {
  const normalized = papeis.filter((papel): papel is Papel => isPapel(String(papel)));
  if (normalized.includes("professor")) return ["professor"];
  return [...new Set(normalized)];
}

export function usuarioTemPapel(papeis: readonly string[], papel: Papel): boolean {
  return papeis.includes(papel);
}

export function precisaEsportesPratica(papeis: readonly string[]): boolean {
  return papeis.some((papel) => papel === "atleta" || papel === "professor");
}

export function legacyTipoUsuarioFromPapeis(papeis: readonly string[]): string {
  if (papeis.includes("espaco")) return "espaco";
  if (papeis.includes("organizador")) return "organizador";
  if (papeis.includes("professor")) return "professor";
  if (papeis.includes("atleta")) return "atleta";
  return "atleta";
}

export function parseDetalhesPapel(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function obterDetalhesPapel(
  rows: PapelRow[] | null | undefined,
  papel: Papel
): Record<string, unknown> {
  const row = (rows ?? []).find((item) => item.papel === papel);
  return parseDetalhesPapel(row?.detalhes_json);
}
