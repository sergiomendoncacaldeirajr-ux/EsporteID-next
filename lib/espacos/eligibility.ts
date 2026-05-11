import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

type NullableDate = string | Date | null | undefined;

export type EspacoSocioResumo = {
  status?: string | null;
  documentos_status?: string | null;
  financeiro_status?: string | null;
  beneficios_liberados?: boolean | null;
  validade_ate?: NullableDate;
};

export type EspacoPlanoResumo = {
  limite_reservas_dia?: number | null;
  limite_reservas_semana?: number | null;
  cooldown_horas?: number | null;
  antecedencia_min_horas?: number | null;
  antecedencia_max_dias?: number | null;
  reservas_gratuitas_semana?: number | null;
  percentual_desconto_avulso?: number | null;
  beneficios_json?: Record<string, unknown> | null;
};

export type EspacoBenefitStatus = {
  ok: boolean;
  motivo: string | null;
  reservasGratisSemana: number;
  descontoAvulso: number;
  cooldownHoras: number;
  antecedenciaMinHoras: number;
  antecedenciaMaxDias: number;
  limiteReservasDia: number;
  limiteReservasSemana: number;
};

function toDate(value: NullableDate) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function planoHerdaRegra(plano: EspacoPlanoResumo | null | undefined, key: string) {
  const beneficios = plano?.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const herdar = (beneficios as Record<string, unknown>).herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

export function avaliarBeneficiosSocioEspaco({
  socio,
  plano,
  configuracaoEspaco,
}: {
  socio: EspacoSocioResumo | null | undefined;
  plano?: EspacoPlanoResumo | null | undefined;
  configuracaoEspaco?: unknown;
}): EspacoBenefitStatus {
  const cfg = normalizeEspacoReservaConfig(configuracaoEspaco);

  if (!socio) {
    return {
      ok: false,
      motivo: "Você ainda não é sócio ativo deste espaço.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  const validade = toDate(socio.validade_ate);
  if (socio.status !== "ativo") {
    return {
      ok: false,
      motivo: "Seu vínculo de sócio ainda não está ativo.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  if (socio.documentos_status !== "aprovado") {
    return {
      ok: false,
      motivo: "Seus documentos ainda não foram aprovados.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  if (cfg.bloqueiaInadimplente && socio.financeiro_status !== "em_dia") {
    return {
      ok: false,
      motivo: "Seus benefícios estão bloqueados por pendência financeira.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  if (!socio.beneficios_liberados) {
    return {
      ok: false,
      motivo: "Os benefícios do seu plano ainda não foram liberados.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  if (validade && validade.getTime() < Date.now()) {
    return {
      ok: false,
      motivo: "Seu plano de sócio expirou.",
      reservasGratisSemana: 0,
      descontoAvulso: 0,
      cooldownHoras: cfg.cooldownHoras,
      antecedenciaMinHoras: cfg.antecedenciaMinHoras,
      antecedenciaMaxDias: cfg.antecedenciaMaxDias,
      limiteReservasDia: cfg.limiteReservasDia,
      limiteReservasSemana: cfg.limiteReservasSemana,
    };
  }

  return {
    ok: true,
    motivo: null,
    reservasGratisSemana: Math.max(
      0,
      Number(
        planoHerdaRegra(plano, "reservas_gratuitas_semana")
          ? cfg.gratisLimiteReservasSemanaMembro
          : plano?.reservas_gratuitas_semana ?? cfg.gratisLimiteReservasSemanaMembro
      )
    ),
    descontoAvulso: Math.max(
      0,
      Number(plano?.percentual_desconto_avulso ?? 0)
    ),
    cooldownHoras: Math.max(
      0,
      Number(
        planoHerdaRegra(plano, "cooldown_horas")
          ? cfg.cooldownHoras
          : plano?.cooldown_horas ?? cfg.cooldownHoras
      )
    ),
    antecedenciaMinHoras: Math.max(
      0,
      Number(plano?.antecedencia_min_horas ?? cfg.antecedenciaMinHoras)
    ),
    antecedenciaMaxDias: Math.max(
      1,
      Number(
        planoHerdaRegra(plano, "antecedencia_max_dias")
          ? cfg.antecedenciaMaxDias
          : plano?.antecedencia_max_dias ?? cfg.antecedenciaMaxDias
      )
    ),
    limiteReservasDia: Math.max(
      0,
      Number(plano?.limite_reservas_dia ?? cfg.limiteReservasDia)
    ),
    limiteReservasSemana: Math.max(
      0,
      Number(
        planoHerdaRegra(plano, "limite_reservas_semana")
          ? cfg.limiteReservasSemana
          : plano?.limite_reservas_semana ?? cfg.limiteReservasSemana
      )
    ),
  };
}
