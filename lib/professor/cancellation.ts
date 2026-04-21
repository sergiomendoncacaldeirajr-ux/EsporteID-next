export type PoliticaCancelamentoProfessor = {
  resumo: string | null;
  antecedenciaMinutos: number;
  percentualRetencao: number;
  valorFixoCentavos: number;
  cobrarNoShow: boolean;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function parsePoliticaCancelamentoProfessor(
  value: unknown
): PoliticaCancelamentoProfessor {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    resumo: typeof obj.resumo === "string" && obj.resumo.trim() ? obj.resumo.trim() : null,
    antecedenciaMinutos: Math.round(
      clampNumber(obj.antecedenciaMinutos, 0, 60 * 24 * 30, 0)
    ),
    percentualRetencao: clampNumber(obj.percentualRetencao, 0, 100, 0),
    valorFixoCentavos: Math.round(
      clampNumber(obj.valorFixoCentavos, 0, 1_000_000_000, 0)
    ),
    cobrarNoShow: Boolean(obj.cobrarNoShow),
  };
}

export function serializarPoliticaCancelamentoProfessor(input: {
  resumo?: string | null;
  antecedenciaMinutos?: number;
  percentualRetencao?: number;
  valorFixoCentavos?: number;
  cobrarNoShow?: boolean;
}) {
  const policy = parsePoliticaCancelamentoProfessor(input);
  return {
    resumo: policy.resumo,
    antecedenciaMinutos: policy.antecedenciaMinutos,
    percentualRetencao: policy.percentualRetencao,
    valorFixoCentavos: policy.valorFixoCentavos,
    cobrarNoShow: policy.cobrarNoShow,
  };
}

export function descreverPoliticaCancelamentoProfessor(value: unknown) {
  const policy = parsePoliticaCancelamentoProfessor(value);
  const parts: string[] = [];

  if (policy.antecedenciaMinutos > 0) {
    const horas = policy.antecedenciaMinutos / 60;
    parts.push(
      horas >= 1 && Number.isInteger(horas)
        ? `cancelamento sem custo com ${horas}h de antecedência`
        : `cancelamento sem custo com ${policy.antecedenciaMinutos} min de antecedência`
    );
  } else {
    parts.push("cancelamento sem custo a qualquer momento antes da aula");
  }

  if (policy.percentualRetencao > 0) {
    parts.push(`retenção de ${policy.percentualRetencao}% fora da janela`);
  } else if (policy.valorFixoCentavos > 0) {
    parts.push(
      `retenção fixa de R$ ${(policy.valorFixoCentavos / 100).toFixed(2).replace(".", ",")}`
    );
  }

  if (policy.cobrarNoShow) {
    parts.push("no-show sujeito à cobrança");
  }

  if (policy.resumo) {
    parts.push(policy.resumo);
  }

  return parts.join(" · ");
}

export function calcularTaxaCancelamentoProfessor(args: {
  politica: unknown;
  valorCentavos: number;
  inicio: string | Date | null | undefined;
  agora?: Date;
}) {
  const policy = parsePoliticaCancelamentoProfessor(args.politica);
  const valorCentavos = Math.max(0, Math.round(Number(args.valorCentavos ?? 0) || 0));
  const agora = args.agora ?? new Date();
  const inicio = args.inicio ? new Date(args.inicio) : null;
  const inicioMs = inicio?.getTime() ?? NaN;
  const diferencaMinutos = Number.isFinite(inicioMs)
    ? Math.floor((inicioMs - agora.getTime()) / 60000)
    : null;

  if (diferencaMinutos == null) {
    return { taxaCentavos: 0, status: "cancelada" as const, resumo: "Cancelamento registrado." };
  }

  if (diferencaMinutos < 0) {
    const taxaCentavos = policy.cobrarNoShow ? valorCentavos : 0;
    return {
      taxaCentavos,
      status: "faltou" as const,
      resumo: policy.cobrarNoShow
        ? "A aula já começou. O registro foi tratado como falta."
        : "A aula já começou. O registro foi tratado como falta sem cobrança adicional.",
    };
  }

  if (diferencaMinutos >= policy.antecedenciaMinutos) {
    return {
      taxaCentavos: 0,
      status: "cancelada" as const,
      resumo: "Cancelamento dentro da antecedência permitida.",
    };
  }

  const percentual = Math.round(valorCentavos * (policy.percentualRetencao / 100));
  const taxaCentavos = Math.min(
    valorCentavos,
    Math.max(policy.valorFixoCentavos, percentual)
  );

  return {
    taxaCentavos,
    status: "cancelada" as const,
    resumo:
      taxaCentavos > 0
        ? "Cancelamento fora da antecedência mínima, com retenção prevista."
        : "Cancelamento registrado.",
  };
}
