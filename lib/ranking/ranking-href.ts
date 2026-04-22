/** Monta query string da página /ranking com defaults explícitos ao trocar filtros (page volta a 1). */

export type RankingSearchState = {
  tipo: "individual" | "dupla" | "time";
  rank: "match" | "eid";
  local: "brasil" | "cidade";
  /** Vazio = esporte principal do perfil (omitido na URL). */
  esporte: string;
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
  const rankRaw = (g("rank") ?? "match").toLowerCase();
  const rank: RankingSearchState["rank"] = rankRaw === "eid" ? "eid" : "match";
  const localRaw = (g("local") ?? "cidade").toLowerCase();
  const local: RankingSearchState["local"] = localRaw === "brasil" ? "brasil" : "cidade";
  const esporte = String(g("esporte") ?? "").trim();
  const page = Math.max(1, Number(g("page") ?? 1) || 1);
  return { tipo, rank, local, esporte, page };
}

/**
 * @param principalEsporteId — usado para omitir `?esporte=` quando o filtro coincide com o principal do perfil.
 */
export function rankingHref(
  next: Partial<RankingSearchState> & { page?: number },
  base: RankingSearchState,
  principalEsporteId?: number | null
): string {
  const merged: RankingSearchState = {
    tipo: next.tipo ?? base.tipo,
    rank: next.rank ?? base.rank,
    local: next.local ?? base.local,
    esporte: next.esporte !== undefined ? next.esporte : base.esporte,
    page: next.page !== undefined ? next.page : base.page,
  };
  const u = new URLSearchParams();
  if (merged.tipo !== "individual") u.set("tipo", merged.tipo);
  if (merged.rank !== "match") u.set("rank", merged.rank);
  if (merged.local !== "cidade") u.set("local", merged.local);
  const pe = principalEsporteId != null && principalEsporteId > 0 ? String(principalEsporteId) : "";
  if (merged.esporte && merged.esporte !== pe) u.set("esporte", merged.esporte);
  if (merged.page > 1) u.set("page", String(merged.page));
  const q = u.toString();
  return q ? `/ranking?${q}` : "/ranking";
}
