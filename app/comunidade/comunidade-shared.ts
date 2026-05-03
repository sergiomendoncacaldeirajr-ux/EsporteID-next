import type { AgendaPartidaCardRow } from "@/lib/agenda/partidas-usuario";

export function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

export function mergeAgendaPartidasPorId(
  a: AgendaPartidaCardRow[] | null | undefined,
  b: AgendaPartidaCardRow[] | null | undefined
): AgendaPartidaCardRow[] {
  const m = new Map<number, AgendaPartidaCardRow>();
  for (const r of a ?? []) {
    const id = Number((r as { id?: number }).id ?? 0);
    if (Number.isFinite(id) && id > 0) m.set(id, r);
  }
  for (const r of b ?? []) {
    const id = Number((r as { id?: number }).id ?? 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!m.has(id)) m.set(id, r);
  }
  return [...m.values()];
}

export function partidaPainelEhRelancamentoPosContestacao(row: AgendaPartidaCardRow, viewerId: string): boolean {
  const st = String((row as { status?: string | null }).status ?? "")
    .trim()
    .toLowerCase();
  const sr = String((row as { status_ranking?: string | null }).status_ranking ?? "")
    .trim()
    .toLowerCase();
  const lp = String((row as { lancado_por?: string | null }).lancado_por ?? "").trim();
  return st === "aguardando_confirmacao" && sr === "resultado_contestado" && lp === viewerId;
}

export function dueloKey(
  a: string | null | undefined,
  b: string | null | undefined,
  esporteId: number | null | undefined
): string | null {
  if (!a || !b || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) return null;
  const [x, y] = [String(a), String(b)].sort();
  return `${Number(esporteId)}:${x}:${y}`;
}

export function dueloKeyNoSport(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a || !b) return null;
  const [x, y] = [String(a), String(b)].sort();
  return `${x}:${y}`;
}
