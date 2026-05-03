import { redirect } from "next/navigation";
import type { MatchRadarFinalidade, RadarTipo, SortBy } from "@/lib/match/radar-snapshot";

export type MatchPageSearch = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  sort_by?: string;
  status?: string;
  finalidade?: string;
  view?: string;
  genero?: string;
};

export type RadarViewMode = "full" | "grid";
export type RadarGeneroFiltro = "all" | "masculino" | "feminino" | "outro";

export function toTipo(v: string | undefined): RadarTipo {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "dupla" || s === "time" || s === "todas") return s;
  return "atleta";
}

export function toSortBy(v: string | undefined): SortBy {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "eid_score") return "eid_score";
  return "match_ranking_points";
}

export function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

export function toMatchFinalidade(v: string | undefined): MatchRadarFinalidade {
  return String(v ?? "").trim().toLowerCase() === "amistoso" ? "amistoso" : "ranking";
}

export function toViewMode(v: string | undefined): RadarViewMode {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "full") return "full";
  return "grid";
}

export function toGeneroFiltro(v: string | undefined): RadarGeneroFiltro {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "masculino" || raw === "feminino" || raw === "outro" || raw === "all") return raw;
  return "all";
}

/** Redireciona quando combinação amistoso + view + tipo é inválida (mesma regra da página). */
export function redirectIfAmistosoViewInvalid(sp: MatchPageSearch) {
  const initialView = toViewMode(sp.view);
  const matchFinalidade = toMatchFinalidade(sp.finalidade);
  const tipo = toTipo(sp.tipo);
  if (initialView !== "full" && matchFinalidade === "amistoso" && tipo !== "atleta" && tipo !== "todas") {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v.length > 0) q.set(k, v);
    }
    q.set("tipo", "atleta");
    q.set("finalidade", "amistoso");
    redirect(`/match?${q.toString()}`);
  }
}
