import type { SupabaseClient } from "@supabase/supabase-js";
import type { PodiumSlot } from "@/components/ranking/ranking-compact";
import type { RankingSearchState } from "@/lib/ranking/ranking-href";

/** Limite alto para não truncar histórico antes de achar o evento mais recente por time (PostgREST). */
const COLETIVO_EID_EVENTS_LIMIT = 30_000;

/**
 * Última nota EID conhecida por `times.id`, unindo `historico_eid_coletivo` e `eid_logs` (mais recente por data).
 * Usado no ranking coletivo quando `rank=eid` — evita depender só de `times.eid_time` se estiver defasado.
 */
export async function fetchLatestColetivoEidByTimeId(
  supabase: SupabaseClient,
  teamIds: number[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (teamIds.length === 0) return out;

  const [{ data: histRows }, { data: logRows }] = await Promise.all([
    supabase
      .from("historico_eid_coletivo")
      .select("time_id, nota_nova, data_alteracao")
      .in("time_id", teamIds)
      .order("data_alteracao", { ascending: false })
      .limit(COLETIVO_EID_EVENTS_LIMIT),
    supabase
      .from("eid_logs")
      .select("entity_time_id, new_score, created_at")
      .eq("entity_kind", "time")
      .in("entity_time_id", teamIds)
      .order("created_at", { ascending: false })
      .limit(COLETIVO_EID_EVENTS_LIMIT),
  ]);

  type Ev = { tid: number; score: number; ts: number };
  const events: Ev[] = [];

  for (const h of histRows ?? []) {
    const tid = Number(h.time_id ?? 0);
    if (!tid) continue;
    const score = Number(h.nota_nova);
    const ts = new Date(String(h.data_alteracao ?? "")).getTime();
    if (!Number.isFinite(score) || !Number.isFinite(ts)) continue;
    events.push({ tid, score, ts });
  }

  for (const lg of logRows ?? []) {
    const tid = Number(lg.entity_time_id ?? 0);
    if (!tid) continue;
    const score = Number(lg.new_score);
    const ts = new Date(String(lg.created_at ?? "")).getTime();
    if (!Number.isFinite(score) || !Number.isFinite(ts)) continue;
    events.push({ tid, score, ts });
  }

  events.sort((a, b) => b.ts - a.ts);
  for (const e of events) {
    if (!out.has(e.tid)) out.set(e.tid, e.score);
  }

  return out;
}

export type ProfileMini = { nome?: string | null; avatar_url?: string | null; localizacao?: string | null; genero?: string | null };
export type SportMini = { nome?: string | null };

export type UsuarioEidRow = {
  usuario_id: string;
  esporte_id: number;
  nota_eid?: number | null;
  pontos_ranking?: number | null;
  vitorias?: number | null;
  derrotas?: number | null;
  posicao_rank?: number | null;
  profiles?: ProfileMini | ProfileMini[] | null;
  esportes?: SportMini | SportMini[] | null;
};

export type TimeRow = {
  id: number;
  nome?: string | null;
  escudo?: string | null;
  localizacao?: string | null;
  criador_id?: string | null;
  genero?: string | null;
  pontos_ranking?: number | null;
  eid_time?: number | null;
  esporte_id?: number | null;
  tipo?: string | null;
  esportes?: SportMini | SportMini[] | null;
};

export type MeuEsporteRow = {
  esporte_id: number;
  esportes?: SportMini | SportMini[] | null;
};

export type UnifiedRank = {
  key: string;
  nome: string;
  avatarUrl: string | null;
  pontos: number;
  notaEid: number;
  vitorias?: number | null;
  derrotas?: number | null;
  posicaoRank?: number | null;
  usuarioId?: string;
  timeId?: number;
  href: string;
};

export type PartidaPeriodoRow = {
  jogador1_id?: string | null;
  jogador2_id?: string | null;
  time1_id?: number | string | null;
  time2_id?: number | string | null;
  data_resultado?: string | null;
  data_partida?: string | null;
  data_registro?: string | null;
};

export type PartidaRankingRow = {
  id?: number | null;
  jogador1_id?: string | null;
  jogador2_id?: string | null;
  time1_id?: number | null;
  time2_id?: number | null;
  vencedor_id?: number | null;
  placar_1?: number | null;
  placar_2?: number | null;
  placar_desafiante?: number | null;
  placar_desafiado?: number | null;
  data_resultado?: string | null;
  data_partida?: string | null;
  data_registro?: string | null;
};

export type GeneroBucket = "masculino" | "feminino" | "misto";

export function timestampPartidaNoMesAtual(p: PartidaPeriodoRow, monthStartMs: number, nextMonthStartMs: number): boolean {
  const raw = p.data_resultado ?? p.data_partida ?? p.data_registro;
  if (raw == null || raw === "") return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= monthStartMs && t < nextMonthStartMs;
}

export function numTimeId(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export const LIST_PAGE_SIZE = 10;

export function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function normalizeCityHint(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const part = s.split(",")[0]?.trim() ?? s;
  return normalizeSearchText(part);
}

export function cidadeDisplayFromProfile(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const part = s.split(",")[0]?.trim() ?? s;
  return part || null;
}

export function normalizeSearchText(raw: string | null | undefined): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function bestViewerRankIndex(
  rows: UnifiedRank[],
  viewerId: string,
  teamIds: Set<number>,
  mode: RankingSearchState["tipo"],
): number | null {
  let best: number | null = null;
  rows.forEach((r, i) => {
    if (mode === "individual") {
      if (r.usuarioId === viewerId) {
        if (best === null || i < best) best = i;
      }
    } else {
      if (r.timeId !== undefined && teamIds.has(r.timeId)) {
        if (best === null || i < best) best = i;
      }
    }
  });
  return best;
}

export function toPodiumSlot(row: UnifiedRank | undefined, place: string): PodiumSlot | null {
  if (!row) return null;
  return {
    place,
    nome: row.nome,
    avatarUrl: row.avatarUrl,
    notaEid: row.notaEid,
    pontos: row.pontos,
    href: row.href,
  };
}

export function normalizeGeneroRanking(raw: string | null | undefined): "masculino" | "feminino" | "" {
  const g = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (g === "masculino") return "masculino";
  if (g === "feminino") return "feminino";
  return "";
}

export function matchBucketIndividual(g1: string | null | undefined, g2: string | null | undefined): GeneroBucket {
  const a = normalizeGeneroRanking(g1);
  const b = normalizeGeneroRanking(g2);
  if (a && a === b) return a;
  return "misto";
}

export function teamBucketFromMembers(memberGeneros: Array<string | null | undefined>): GeneroBucket {
  const set = new Set(memberGeneros.map((g) => normalizeGeneroRanking(g)).filter(Boolean));
  if (set.size === 1) return Array.from(set)[0] as GeneroBucket;
  return "misto";
}

export function matchBucketFormacoes(t1: GeneroBucket, t2: GeneroBucket): GeneroBucket {
  if (t1 === t2 && (t1 === "masculino" || t1 === "feminino")) return t1;
  return "misto";
}
