import type { AgendaPartidaCardRow } from "@/lib/agenda/partidas-usuario";

/** Lado do confronto como time/dupla (nome + escudo + EID do time), para cards da agenda. */
export type PartidaAgendaFormacaoLado = {
  timeId: number;
  nome: string;
  escudoUrl: string | null;
  eidNota: number;
};

type TimeRow = { nome?: string | null; escudo?: string | null; eid_time?: number | null };

export function pickFormacaoLadoPartida(
  pr: AgendaPartidaCardRow,
  lado: 1 | 2,
  timesById: Map<number, TimeRow>
): PartidaAgendaFormacaoLado | undefined {
  const mod = String(pr.modalidade ?? "").trim().toLowerCase();
  if (mod !== "dupla" && mod !== "time") return undefined;
  const tid = lado === 1 ? Number(pr.time1_id) : Number(pr.time2_id);
  if (!Number.isFinite(tid) || tid <= 0) return undefined;
  const t = timesById.get(tid);
  if (!t) return undefined;
  const nome = String(t.nome ?? "").trim() || "Formação";
  const rawEscudo = t.escudo != null ? String(t.escudo).trim() : "";
  return {
    timeId: tid,
    nome,
    escudoUrl: rawEscudo.length > 0 ? rawEscudo : null,
    eidNota: Number(t.eid_time ?? 0),
  };
}
