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
  bloqueiaInadimplente: boolean;
  reservasGratisLiberadas: boolean;
  cancelamentoGratuitaPermite: boolean;
  cancelamentoGratuitaAntecedenciaHoras: number;
  cancelamentoGratuitaPermiteAposPrazo: boolean;
  cancelamentoGratuitaMultaTipo: "nenhuma" | "percentual" | "fixa";
  cancelamentoGratuitaMultaPercentual: number;
  cancelamentoGratuitaMultaCentavos: number;
  cancelamentoPagaPermite: boolean;
  cancelamentoPagaAntecedenciaHoras: number;
  cancelamentoPagaPermiteAposPrazo: boolean;
  cancelamentoPagaMultaTipo: "nenhuma" | "percentual" | "fixa";
  cancelamentoPagaMultaPercentual: number;
  cancelamentoPagaMultaCentavos: number;
  permiteTransferenciaReserva: boolean;
  transferenciaAntecedenciaHoras: number;
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
    limiteReservasDia: Math.max(0, Math.round(num(data.limiteReservasDia, 0))),
    limiteReservasSemana: Math.max(0, Math.round(num(data.limiteReservasSemana, 0))),
    cooldownHoras: Math.max(0, Math.round(num(data.cooldownHoras, 0))),
    antecedenciaMinHoras: Math.max(0, Math.round(num(data.antecedenciaMinHoras, 0))),
    antecedenciaMaxDias: Math.max(0, Math.round(num(data.antecedenciaMaxDias, 0))),
    gratisLimiteReservasDiaMembro: Math.max(
      0,
      Math.round(num(data.gratisLimiteReservasDiaMembro, num(data.limiteReservasDia, 0)))
    ),
    gratisLimiteReservasSemanaMembro: Math.max(
      0,
      Math.round(num(data.gratisLimiteReservasSemanaMembro, num(data.limiteReservasSemana, 0)))
    ),
    gratisIntervaloHorasEntreReservasMembro: Math.max(
      0,
      Math.round(num(data.gratisIntervaloHorasEntreReservasMembro, num(data.cooldownHoras, 0)))
    ),
    gratisAntecedenciaMaxDiasMembro: Math.max(
      0,
      Math.round(num(data.gratisAntecedenciaMaxDiasMembro, num(data.antecedenciaMaxDias, 0)))
    ),
    bloqueiaInadimplente: bool(data.bloqueiaInadimplente, true),
    reservasGratisLiberadas: bool(data.reservasGratisLiberadas, true),
    cancelamentoGratuitaPermite: bool(data.cancelamentoGratuitaPermite, true),
    cancelamentoGratuitaAntecedenciaHoras: Math.max(
      0,
      Math.round(num(data.cancelamentoGratuitaAntecedenciaHoras, num(data.cancelamentoAntecedenciaHoras, 0)))
    ),
    cancelamentoGratuitaPermiteAposPrazo: bool(
      data.cancelamentoGratuitaPermiteAposPrazo,
      bool(data.cancelamentoPermiteAposPrazo, false)
    ),
    cancelamentoGratuitaMultaTipo: ["nenhuma", "percentual", "fixa"].includes(String(data.cancelamentoGratuitaMultaTipo ?? data.cancelamentoMultaTipo))
      ? (String(data.cancelamentoGratuitaMultaTipo ?? data.cancelamentoMultaTipo) as "nenhuma" | "percentual" | "fixa")
      : "nenhuma",
    cancelamentoGratuitaMultaPercentual: Math.max(
      0,
      Math.min(100, num(data.cancelamentoGratuitaMultaPercentual, num(data.cancelamentoMultaPercentual, 0)))
    ),
    cancelamentoGratuitaMultaCentavos: Math.max(
      0,
      Math.round(num(data.cancelamentoGratuitaMultaCentavos, num(data.cancelamentoMultaCentavos, 0)))
    ),
    cancelamentoPagaPermite: bool(data.cancelamentoPagaPermite, false),
    cancelamentoPagaAntecedenciaHoras: Math.max(
      0,
      Math.round(num(data.cancelamentoPagaAntecedenciaHoras, num(data.cancelamentoAntecedenciaHoras, 0)))
    ),
    cancelamentoPagaPermiteAposPrazo: bool(data.cancelamentoPagaPermiteAposPrazo, false),
    cancelamentoPagaMultaTipo: ["nenhuma", "percentual", "fixa"].includes(String(data.cancelamentoPagaMultaTipo))
      ? (String(data.cancelamentoPagaMultaTipo) as "nenhuma" | "percentual" | "fixa")
      : "nenhuma",
    cancelamentoPagaMultaPercentual: Math.max(
      0,
      Math.min(100, num(data.cancelamentoPagaMultaPercentual, 0))
    ),
    cancelamentoPagaMultaCentavos: Math.max(
      0,
      Math.round(num(data.cancelamentoPagaMultaCentavos, 0))
    ),
    permiteTransferenciaReserva: bool(data.permiteTransferenciaReserva, false),
    transferenciaAntecedenciaHoras: Math.max(
      0,
      Math.round(num(data.transferenciaAntecedenciaHoras, num(data.cancelamentoGratuitaAntecedenciaHoras, 0)))
    ),
    politicaCancelamento: text(data.politicaCancelamento, ""),
    observacoesPublicas: text(data.observacoesPublicas, ""),
  };
}

export function serializarEspacoReservaConfig(input: unknown) {
  return normalizeEspacoReservaConfig(input);
}
