/**
 * Janela de data/hora para confrontos de ranking (individual, dupla e time):
 * mesma tolerância das 3 opções de reagendamento após recusa de cancelamento (72h).
 */

export const CONFRONTO_AGENDAMENTO_JANELA_HORAS = 72;

export function agendamentoRankingDentroDaJanelaUtc(dataPartida: Date, agora: Date = new Date()): boolean {
  const t = dataPartida.getTime();
  if (Number.isNaN(t)) return false;
  if (t < agora.getTime()) return false;
  const max = agora.getTime() + CONFRONTO_AGENDAMENTO_JANELA_HORAS * 60 * 60 * 1000;
  return t <= max;
}

export function minDatetimeLocalValue(reference: Date = new Date()): string {
  const d = reference;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function maxDatetimeLocalValueHorasAFrente(
  horas: number = CONFRONTO_AGENDAMENTO_JANELA_HORAS,
  reference: Date = new Date()
): string {
  const d = new Date(reference.getTime() + horas * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function clampDatetimeLocalBetweenMinMax(raw: string, min: string, max: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return min;
  const tMin = new Date(min).getTime();
  const tMax = new Date(max).getTime();
  if (Number.isNaN(tMin) || Number.isNaN(tMax)) return v;
  if (t < tMin) return min;
  if (t > tMax) return max;
  return v;
}
