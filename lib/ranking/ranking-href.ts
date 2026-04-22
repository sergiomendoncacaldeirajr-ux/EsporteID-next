/** Monta query string da página /ranking com defaults explícitos ao trocar filtros (page volta a 1). */

export type RankingSearchState = {
  tipo: "individual" | "dupla" | "time";
  rank: "match" | "eid";
  local: "brasil" | "cidade";
  page: number;
};

export function parseRankingSearch(sp: Record<string, string | string[] | undefined>): RankingSearchState {
  const g = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const tipoRaw = (g("tipo") ?? "individual").toLowerCase();
  const tipo: RankingSearchState["tipo"] =
    tipoRaw === "dupla" ? "dupla" : tipoRaw === "time" ? "time" : "individual";
  const rankRaw = (g("rank") ?? "eid").toLowerCase();
  const rank: RankingSearchState["rank"] = rankRaw === "match" ? "match" : "eid";
  const localRaw = (g("local") ?? "brasil").toLowerCase();
  const local: RankingSearchState["local"] = localRaw === "cidade" ? "cidade" : "brasil";
  const page = Math.max(1, Number(g("page") ?? 1) || 1);
  return { tipo, rank, local, page };
}

export function rankingHref(next: Partial<RankingSearchState> & { page?: number }, base: RankingSearchState): string {
  const merged: RankingSearchState = {
    tipo: next.tipo ?? base.tipo,
    rank: next.rank ?? base.rank,
    local: next.local ?? base.local,
    page: next.page !== undefined ? next.page : base.page,
  };
  const u = new URLSearchParams();
  if (merged.tipo !== "individual") u.set("tipo", merged.tipo);
  if (merged.rank !== "eid") u.set("rank", merged.rank);
  if (merged.local !== "brasil") u.set("local", merged.local);
  if (merged.page > 1) u.set("page", String(merged.page));
  const q = u.toString();
  return q ? `/ranking?${q}` : "/ranking";
}
