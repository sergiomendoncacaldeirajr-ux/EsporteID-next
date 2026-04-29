/** Quebra strings comuns de localização ("Cidade - UF", "Cidade / Estado", …) em cidade e estado. */
export function splitCityState(location?: string | null): { cidade: string; estado: string } {
  const raw = String(location ?? "").trim();
  if (!raw) return { cidade: "-", estado: "-" };
  const parts = raw
    .split(/\/| - |–|—|,|\|/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { cidade: parts[0] ?? "-", estado: parts.slice(1).join(" ") || "-" };
  return { cidade: raw, estado: "-" };
}
