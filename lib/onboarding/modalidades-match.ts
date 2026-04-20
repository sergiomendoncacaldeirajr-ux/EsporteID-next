/** Modalidades em que o atleta aceita jogar match (pode combinar várias). */

export type MatchModality = "individual" | "dupla" | "time";

export const MATCH_MODALITY_ORDER: MatchModality[] = ["individual", "dupla", "time"];

const LABELS: Record<MatchModality, string> = {
  individual: "Individual",
  dupla: "Dupla",
  time: "Time",
};

export function sortModalidadesMatch(mods: MatchModality[]): MatchModality[] {
  const set = new Set(mods);
  return MATCH_MODALITY_ORDER.filter((m) => set.has(m));
}

export function labelModalidadesMatchPt(mods: MatchModality[]): string {
  return sortModalidadesMatch(mods).map((m) => LABELS[m]).join(", ");
}

export function modalidadesFromUsuarioEidRow(row: {
  modalidades_match?: string[] | null;
  modalidade_match?: string | null;
}): MatchModality[] {
  const arr = row.modalidades_match;
  if (Array.isArray(arr) && arr.length > 0) {
    const ok = arr.filter((x): x is MatchModality => x === "individual" || x === "dupla" || x === "time");
    if (ok.length > 0) return sortModalidadesMatch(ok);
  }
  const m = row.modalidade_match;
  if (m === "individual" || m === "dupla" || m === "time") return [m];
  return ["individual"];
}

export function parseMatchModality(raw: string): MatchModality | null {
  const v = raw.trim().toLowerCase();
  if (v === "individual" || v === "dupla" || v === "time") return v;
  return null;
}
