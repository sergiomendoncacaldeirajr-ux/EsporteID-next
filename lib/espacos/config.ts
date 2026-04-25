type JsonRecord = Record<string, unknown>;

export type EspacoReservaConfig = {
  limiteReservasDia: number;
  limiteReservasSemana: number;
  cooldownHoras: number;
  antecedenciaMinHoras: number;
  antecedenciaMaxDias: number;
  gratisLimiteReservasDiaMembro: number;
  gratisLimiteReservasSemanaMembro: number;
  gratisIntervaloHorasEntreReservasMembro: number;
  gratisAntecedenciaMaxDiasMembro: number;
  waitlistExpiracaoMinutos: number;
  bloqueiaInadimplente: boolean;
  reservasGratisLiberadas: boolean;
  politicaCancelamento: string;
  observacoesPublicas: string;
};

function asRecord(input: unknown): JsonRecord {
  if (!input) return {};
  if (typeof input === "object") return input as JsonRecord;
  if (typeof input !== "string") return {};
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" ? (parsed as JsonRecord) : {};
  } catch {
    return {};
  }
}

function num(input: unknown, fallback: number) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(input: unknown, fallback: boolean) {
  return typeof input === "boolean" ? input : fallback;
}

function text(input: unknown, fallback = "") {
  return typeof input === "string" ? input.trim() || fallback : fallback;
}

export function normalizeEspacoReservaConfig(input: unknown): EspacoReservaConfig {
  const data = asRecord(input);
  return {
    limiteReservasDia: Math.max(0, Math.round(num(data.limiteReservasDia, 1))),
    limiteReservasSemana: Math.max(0, Math.round(num(data.limiteReservasSemana, 3))),
    cooldownHoras: Math.max(0, Math.round(num(data.cooldownHoras, 2))),
    antecedenciaMinHoras: Math.max(0, Math.round(num(data.antecedenciaMinHoras, 1))),
    antecedenciaMaxDias: Math.max(1, Math.round(num(data.antecedenciaMaxDias, 30))),
    gratisLimiteReservasDiaMembro: Math.max(
      0,
      Math.round(num(data.gratisLimiteReservasDiaMembro, num(data.limiteReservasDia, 1)))
    ),
    gratisLimiteReservasSemanaMembro: Math.max(
      0,
      Math.round(num(data.gratisLimiteReservasSemanaMembro, num(data.limiteReservasSemana, 3)))
    ),
    gratisIntervaloHorasEntreReservasMembro: Math.max(
      0,
      Math.round(num(data.gratisIntervaloHorasEntreReservasMembro, num(data.cooldownHoras, 2)))
    ),
    gratisAntecedenciaMaxDiasMembro: Math.max(
      1,
      Math.round(num(data.gratisAntecedenciaMaxDiasMembro, num(data.antecedenciaMaxDias, 30)))
    ),
    waitlistExpiracaoMinutos: Math.max(5, Math.round(num(data.waitlistExpiracaoMinutos, 60))),
    bloqueiaInadimplente: bool(data.bloqueiaInadimplente, true),
    reservasGratisLiberadas: bool(data.reservasGratisLiberadas, true),
    politicaCancelamento: text(data.politicaCancelamento, ""),
    observacoesPublicas: text(data.observacoesPublicas, ""),
  };
}

export function serializarEspacoReservaConfig(input: unknown) {
  return normalizeEspacoReservaConfig(input);
}
