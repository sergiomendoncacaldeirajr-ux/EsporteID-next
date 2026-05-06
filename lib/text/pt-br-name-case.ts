const PT_BR_JOINERS = new Set([
  "da",
  "das",
  "de",
  "des",
  "di",
  "do",
  "dos",
  "du",
  "e",
]);

function capitalizeChunk(chunk: string): string {
  if (!chunk) return "";
  const lower = chunk.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

function normalizeToken(token: string, forceCapitalize: boolean): string {
  const trimmed = token.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLocaleLowerCase("pt-BR");
  if (!forceCapitalize && PT_BR_JOINERS.has(lower)) return lower;

  return lower
    .split("-")
    .map((part) =>
      part
        .split("'")
        .map((inner) => capitalizeChunk(inner))
        .join("'")
    )
    .join("-");
}

/**
 * Normaliza textos de nome/local para um padrão legível em pt-BR.
 * Ex.: "joAO da siLVa" -> "Joao da Silva"
 */
export function normalizePtBrNameCase(raw: string): string {
  const base = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";

  return base
    .split(" ")
    .map((token, idx) => normalizeToken(token, idx === 0))
    .join(" ");
}

/**
 * Versão para textos compostos por separadores de contexto ("/", ",", " - ").
 * Mantém os separadores e normaliza cada trecho nominal.
 */
export function normalizePtBrNameCaseLoose(raw: string): string {
  const base = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";

  return base
    .split(/(\s*\/\s*|\s*-\s*|\s*,\s*)/g)
    .map((part) => {
      if (/^\s*\/\s*$/.test(part)) return " / ";
      if (/^\s*-\s*$/.test(part)) return " - ";
      if (/^\s*,\s*$/.test(part)) return ", ";
      return normalizePtBrNameCase(part);
    })
    .join("")
    .trim();
}
