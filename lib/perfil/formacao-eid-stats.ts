import type { SupabaseClient } from "@supabase/supabase-js";

export const PARTIDA_STATUS_CONCLUIDA = new Set([
  "encerrada",
  "finalizada",
  "concluida",
  "concluída",
  "validada",
]);

export type PartidaColetivaRow = {
  id: number;
  time1_id: number | null;
  time2_id: number | null;
  placar_1: number | null;
  placar_2: number | null;
  vencedor_id: number | null;
  status: string | null;
  torneio_id: number | null;
  modalidade: string | null;
  data_resultado: string | null;
  data_registro: string | null;
  tipo_partida: string | null;
};

export function fmtDataPtBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function resultadoColetivo(
  myTeamId: number,
  p: Pick<PartidaColetivaRow, "time1_id" | "time2_id" | "placar_1" | "placar_2" | "vencedor_id">
): { label: "V" | "D" | "E" | "—"; tone: string } {
  const t1 = p.time1_id != null ? Number(p.time1_id) : null;
  const t2 = p.time2_id != null ? Number(p.time2_id) : null;
  const isT1 = t1 === myTeamId;
  const isT2 = t2 === myTeamId;
  if (!isT1 && !isT2) return { label: "—", tone: "text-eid-text-secondary" };
  const s1 = Number(p.placar_1);
  const s2 = Number(p.placar_2);
  if (Number.isFinite(s1) && Number.isFinite(s2)) {
    if (s1 === s2) return { label: "E", tone: "text-eid-primary-300" };
    if (isT1) {
      return s1 > s2
        ? { label: "V", tone: "text-emerald-400" }
        : { label: "D", tone: "text-rose-400" };
    }
    return s2 > s1
      ? { label: "V", tone: "text-emerald-400" }
      : { label: "D", tone: "text-rose-400" };
  }
  const vw = p.vencedor_id != null ? Number(p.vencedor_id) : null;
  if (vw != null && Number.isFinite(vw)) {
    if (vw === myTeamId) return { label: "V", tone: "text-emerald-400" };
    const opp = isT1 ? t2 : t1;
    if (opp != null && vw === opp) return { label: "D", tone: "text-rose-400" };
  }
  return { label: "—", tone: "text-eid-text-secondary" };
}

export function trendTripletFromNotas(notas: number[], atual: number): [number, number, number] {
  if (notas.length >= 3)
    return [notas[notas.length - 3]!, notas[notas.length - 2]!, notas[notas.length - 1]!];
  if (notas.length === 2) return [notas[0]!, notas[1]!, atual];
  if (notas.length === 1) return [notas[0]!, atual, atual];
  return [atual, atual, atual];
}

export async function usuarioPertenceAoTime(
  supabase: SupabaseClient,
  userId: string,
  timeId: number
): Promise<boolean> {
  const { data: t } = await supabase.from("times").select("criador_id").eq("id", timeId).maybeSingle();
  if (t?.criador_id === userId) return true;
  const { data: m } = await supabase
    .from("membros_time")
    .select("id")
    .eq("time_id", timeId)
    .eq("usuario_id", userId)
    .in("status", ["ativo", "aceito", "aprovado"])
    .limit(1);
  return (m?.length ?? 0) > 0;
}

export async function carregarPartidasColetivasDoTime(
  supabase: SupabaseClient,
  timeId: number,
  esporteId: number,
  viewerUserId: string
): Promise<PartidaColetivaRow[]> {
  const pertence = await usuarioPertenceAoTime(supabase, viewerUserId, timeId);
  const { data: raw } = await supabase
    .from("partidas")
    .select(
      "id, time1_id, time2_id, placar_1, placar_2, vencedor_id, status, torneio_id, modalidade, data_resultado, data_registro, tipo_partida"
    )
    .eq("esporte_id", esporteId)
    .or(`time1_id.eq.${timeId},time2_id.eq.${timeId}`)
    .order("data_registro", { ascending: false })
    .limit(220);

  return (raw ?? []).filter((p) => {
    const t1 = p.time1_id != null ? Number(p.time1_id) : null;
    const t2 = p.time2_id != null ? Number(p.time2_id) : null;
    if (t1 == null || t2 == null) return false;
    const st = (p.status ?? "").toLowerCase();
    if (PARTIDA_STATUS_CONCLUIDA.has(st)) return true;
    return pertence;
  }) as PartidaColetivaRow[];
}

export async function carregarHistoricoNotasColetivo(
  supabase: SupabaseClient,
  timeId: number
): Promise<number[]> {
  const { data: rows } = await supabase
    .from("historico_eid_coletivo")
    .select("nota_nova, data_alteracao")
    .eq("time_id", timeId)
    .order("data_alteracao", { ascending: true })
    .limit(120);
  const out: number[] = [];
  for (const h of rows ?? []) {
    const n = Number(h.nota_nova);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export async function mapTorneioNomes(
  supabase: SupabaseClient,
  partidas: PartidaColetivaRow[]
): Promise<Map<number, string>> {
  const ids = [...new Set(partidas.map((p) => p.torneio_id).filter((x): x is number => x != null && Number(x) > 0))];
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("torneios").select("id, nome").in("id", ids);
  for (const t of data ?? []) {
    if (t.id != null) map.set(Number(t.id), t.nome ?? `Torneio #${t.id}`);
  }
  return map;
}

export async function mapNomesTimesAdversarios(
  supabase: SupabaseClient,
  timeId: number,
  partidas: PartidaColetivaRow[]
): Promise<Map<number, string>> {
  const opp = new Set<number>();
  for (const p of partidas) {
    const t1 = p.time1_id != null ? Number(p.time1_id) : null;
    const t2 = p.time2_id != null ? Number(p.time2_id) : null;
    if (t1 === timeId && t2 != null) opp.add(t2);
    else if (t2 === timeId && t1 != null) opp.add(t1);
  }
  const map = new Map<number, string>();
  if (opp.size === 0) return map;
  const { data } = await supabase.from("times").select("id, nome").in("id", [...opp]);
  for (const r of data ?? []) {
    if (r.id != null) map.set(Number(r.id), String(r.nome ?? `Equipe #${r.id}`));
  }
  return map;
}
